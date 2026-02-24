/**
 * PolicyEnforcer - Core enforcement layer for ArmorClaw
 * 
 * This class implements path-scoped, role-based policy enforcement
 * that sits on top of ArmorIQ's tool-level enforcement.
 * 
 * Architecture:
 *   Layer 1: ArmorIQ (cryptographic intent tokens + tool allow/deny)
 *   Layer 2: PolicyEnforcer (path scopes + role permissions + constraints)
 */

import { minimatch } from 'minimatch';
import { AuditLogger } from './audit-logger.js';

export class PolicyEnforcer {
  constructor(policyConfig, options = {}) {
    this.policies = policyConfig;
    this.defaultDeny = policyConfig.defaultDeny ?? true;
    this.workspaceRoot = options.workspaceRoot || process.cwd();
    this.auditLogger = new AuditLogger(options.logPath || './logs/audit.jsonl');
    this.verbose = options.verbose ?? true;
  }

  /**
   * Validate an entire intent plan before execution
   * @param {Object} intent - The intent plan to validate
   * @returns {Object} Validation result with step-by-step decisions
   */
  validateIntentPlan(intent) {
    const planResult = {
      intentId: intent.id,
      timestamp: new Date().toISOString(),
      agentRole: intent.agentRole,
      goal: intent.goal,
      overallDecision: 'ALLOWED',
      totalSteps: intent.steps.length,
      allowedSteps: 0,
      blockedSteps: 0,
      stepResults: []
    };

    // Check if role exists
    const rolePolicy = this.policies.roles[intent.agentRole];
    if (!rolePolicy) {
      planResult.overallDecision = 'BLOCKED';
      planResult.reason = `Unknown role: ${intent.agentRole}`;
      this.auditLogger.logPlanValidation(planResult);
      return planResult;
    }

    // Check max operations constraint
    const maxOps = rolePolicy.permissions.constraints?.maxOperationsPerIntent;
    if (maxOps && intent.steps.length > maxOps) {
      planResult.overallDecision = 'BLOCKED';
      planResult.reason = `Intent exceeds max operations (${intent.steps.length} > ${maxOps})`;
      this.auditLogger.logPlanValidation(planResult);
      return planResult;
    }

    // Validate each step
    for (const step of intent.steps) {
      const stepResult = this.validateStep(intent, step);
      planResult.stepResults.push(stepResult);
      
      if (stepResult.decision === 'ALLOWED') {
        planResult.allowedSteps++;
      } else {
        planResult.blockedSteps++;
        planResult.overallDecision = 'PARTIAL';
      }
    }

    // If all steps blocked, mark as fully blocked
    if (planResult.blockedSteps === planResult.totalSteps) {
      planResult.overallDecision = 'BLOCKED';
    }

    this.auditLogger.logPlanValidation(planResult);
    return planResult;
  }

  /**
   * Validate a single step in the intent plan
   * @param {Object} intent - The parent intent plan
   * @param {Object} step - The step to validate
   * @returns {Object} Step validation result
   */
  validateStep(intent, step) {
    // Normalize target - handle both string and object formats
    const targetPath = typeof step.target === 'string' 
      ? step.target 
      : step.target?.path;
    
    const result = {
      stepId: step.stepId,
      action: step.action,
      target: targetPath,
      purpose: step.purpose,
      decision: 'ALLOWED',
      reason: '',
      checks: [],
      timestamp: new Date().toISOString()
    };

    const rolePolicy = this.policies.roles[intent.agentRole];
    const permissions = rolePolicy.permissions;

    // Check 1: Is the tool explicitly denied?
    const toolDenyCheck = this.checkToolDeny(step.action, permissions.tools);
    result.checks.push(toolDenyCheck);
    if (!toolDenyCheck.passed) {
      result.decision = 'BLOCKED';
      result.reason = toolDenyCheck.reason;
      this.logStepDecision(intent, step, result);
      return result;
    }

    // Check 2: Is the tool allowed?
    const toolAllowCheck = this.checkToolAllow(step.action, permissions.tools);
    result.checks.push(toolAllowCheck);
    if (!toolAllowCheck.passed) {
      result.decision = 'BLOCKED';
      result.reason = toolAllowCheck.reason;
      this.logStepDecision(intent, step, result);
      return result;
    }

    // Check 3: Is the path in global denied patterns?
    if (targetPath) {
      const globalDenyCheck = this.checkGlobalDeny(targetPath);
      result.checks.push(globalDenyCheck);
      if (!globalDenyCheck.passed) {
        result.decision = 'BLOCKED';
        result.reason = globalDenyCheck.reason;
        this.logStepDecision(intent, step, result);
        return result;
      }
    }

    // Check 4: Is the path in role's denied paths?
    if (targetPath) {
      const pathDenyCheck = this.checkPathDeny(targetPath, permissions.paths, intent.agentRole);
      result.checks.push(pathDenyCheck);
      if (!pathDenyCheck.passed) {
        result.decision = 'BLOCKED';
        result.reason = pathDenyCheck.reason;
        this.logStepDecision(intent, step, result);
        return result;
      }
    }

    // Check 5: Is the path in role's allowed paths?
    if (targetPath) {
      const pathAllowCheck = this.checkPathAllow(targetPath, permissions.paths, intent.agentRole);
      result.checks.push(pathAllowCheck);
      if (!pathAllowCheck.passed) {
        result.decision = 'BLOCKED';
        result.reason = pathAllowCheck.reason;
        this.logStepDecision(intent, step, result);
        return result;
      }
    }

    // Check 6: Delegation scope (if this is a delegated task)
    if (intent.delegationScope) {
      const delegationCheck = this.checkDelegationScope(step, intent.delegationScope, targetPath);
      result.checks.push(delegationCheck);
      if (!delegationCheck.passed) {
        result.decision = 'BLOCKED';
        result.reason = delegationCheck.reason;
        this.logStepDecision(intent, step, result);
        return result;
      }
    }

    // Check 7: Read-only constraint (check both raw action and mapped tool)
    const mappedTool = this.mapActionToTool(step.action);
    if (permissions.constraints?.readOnly && 
        (['write_file', 'delete_file'].includes(step.action) || 
         ['write_file', 'delete_file'].includes(mappedTool) ||
         ['write', 'delete'].includes(step.action))) {
      const readOnlyCheck = {
        check: 'read-only-constraint',
        passed: false,
        reason: `Role '${intent.agentRole}' is read-only, cannot perform '${step.action}'`
      };
      result.checks.push(readOnlyCheck);
      result.decision = 'BLOCKED';
      result.reason = readOnlyCheck.reason;
      this.logStepDecision(intent, step, result);
      return result;
    }

    // Check 8: File extension constraint
    if (targetPath && permissions.constraints?.allowedExtensions) {
      const extCheck = this.checkFileExtension(targetPath, permissions.constraints.allowedExtensions);
      result.checks.push(extCheck);
      if (!extCheck.passed) {
        result.decision = 'BLOCKED';
        result.reason = extCheck.reason;
        this.logStepDecision(intent, step, result);
        return result;
      }
    }

    // All checks passed
    result.reason = `All ${result.checks.length} policy checks passed`;
    this.logStepDecision(intent, step, result);
    return result;
  }

  // ==================== CHECK METHODS ====================

  checkToolDeny(action, toolPolicy) {
    const toolName = this.mapActionToTool(action);
    const denied = toolPolicy.deny.includes(action) || toolPolicy.deny.includes(toolName);
    return {
      check: 'tool-deny-list',
      passed: !denied,
      reason: denied 
        ? `Tool '${action}' (${toolName}) is in deny list`
        : `Tool '${action}' not in deny list`
    };
  }

  /**
   * Map common action names to tool names for policy matching
   */
  mapActionToTool(action) {
    const actionMap = {
      // Short names -> Policy tool names
      'read': 'read_file',
      'write': 'write_file',
      'delete': 'delete_file',
      'create': 'write_file',
      'list': 'list_dir',
      'search': 'grep_search',
      'execute': 'exec',
      'run': 'exec',
    };
    return actionMap[action] || action;
  }

  checkToolAllow(action, toolPolicy) {
    // Check both the raw action and the mapped tool name
    const toolName = this.mapActionToTool(action);
    const allowed = toolPolicy.allow.includes(action) || toolPolicy.allow.includes(toolName);
    return {
      check: 'tool-allow-list',
      passed: allowed,
      reason: allowed
        ? `Tool '${action}' (${toolName}) is in allow list`
        : `Tool '${action}' not in allow list`
    };
  }

  checkGlobalDeny(path) {
    const globalPatterns = this.policies.globalConstraints?.deniedPatterns || [];
    const normalizedPath = this.normalizePath(path);
    
    for (const pattern of globalPatterns) {
      if (minimatch(normalizedPath, pattern, { dot: true })) {
        return {
          check: 'global-deny-pattern',
          passed: false,
          reason: `Path '${path}' matches global deny pattern '${pattern}'`
        };
      }
    }
    
    return {
      check: 'global-deny-pattern',
      passed: true,
      reason: 'Path does not match any global deny patterns'
    };
  }

  checkPathDeny(path, pathPolicy, role) {
    const normalizedPath = this.normalizePath(path);
    
    for (const pattern of pathPolicy.deny) {
      if (minimatch(normalizedPath, pattern, { dot: true })) {
        return {
          check: 'path-deny-list',
          passed: false,
          reason: `Path '${path}' matches deny pattern '${pattern}' for role '${role}'`
        };
      }
    }
    
    return {
      check: 'path-deny-list',
      passed: true,
      reason: 'Path not in deny list'
    };
  }

  checkPathAllow(path, pathPolicy, role) {
    const normalizedPath = this.normalizePath(path);
    
    for (const pattern of pathPolicy.allow) {
      if (minimatch(normalizedPath, pattern, { dot: true })) {
        return {
          check: 'path-allow-list',
          passed: true,
          reason: `Path '${path}' matches allow pattern '${pattern}'`
        };
      }
    }
    
    // If defaultDeny is true and no allow pattern matched
    if (this.defaultDeny) {
      return {
        check: 'path-allow-list',
        passed: false,
        reason: `Path '${path}' does not match any allow patterns for role '${role}'`
      };
    }
    
    return {
      check: 'path-allow-list',
      passed: true,
      reason: 'Path allowed by default'
    };
  }

  checkDelegationScope(step, delegationScope, targetPath) {
    // Check time validity
    if (delegationScope.validUntil) {
      const now = new Date();
      const validUntil = new Date(delegationScope.validUntil);
      if (now > validUntil) {
        return {
          check: 'delegation-time-scope',
          passed: false,
          reason: `Delegation expired at ${delegationScope.validUntil}`
        };
      }
    }

    // Check action scope (check both raw action and mapped tool)
    const mappedTool = this.mapActionToTool(step.action);
    if (delegationScope.allowedActions && 
        !delegationScope.allowedActions.includes(step.action) &&
        !delegationScope.allowedActions.includes(mappedTool)) {
      return {
        check: 'delegation-action-scope',
        passed: false,
        reason: `Action '${step.action}' not in delegated scope [${delegationScope.allowedActions.join(', ')}]`
      };
    }

    // Check path scope
    if (delegationScope.allowedPaths && targetPath) {
      const normalizedPath = this.normalizePath(targetPath);
      let pathAllowed = false;
      
      for (const pattern of delegationScope.allowedPaths) {
        if (minimatch(normalizedPath, pattern, { dot: true })) {
          pathAllowed = true;
          break;
        }
      }
      
      if (!pathAllowed) {
        return {
          check: 'delegation-path-scope',
          passed: false,
          reason: `Path '${targetPath}' exceeds delegated scope`
        };
      }
    }

    return {
      check: 'delegation-scope',
      passed: true,
      reason: 'Action within delegated scope'
    };
  }

  checkFileExtension(path, allowedExtensions) {
    const ext = this.getFileExtension(path);
    if (!ext) {
      return {
        check: 'file-extension',
        passed: true,
        reason: 'No file extension to check'
      };
    }
    
    const allowed = allowedExtensions.includes(ext);
    return {
      check: 'file-extension',
      passed: allowed,
      reason: allowed
        ? `Extension '${ext}' is allowed`
        : `Extension '${ext}' not in allowed extensions [${allowedExtensions.join(', ')}]`
    };
  }

  // ==================== HELPER METHODS ====================

  normalizePath(filePath) {
    // Normalize to forward slashes
    const normalized = filePath.replace(/\\/g, '/');
    
    // If it's an absolute path, try to make it relative to workspace root
    if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
      const wsRoot = this.workspaceRoot.replace(/\\/g, '/');
      if (normalized.startsWith(wsRoot)) {
        // Remove workspace root prefix
        const relative = normalized.substring(wsRoot.length);
        return relative.replace(/^\/+/, '');
      }
    }
    
    // Remove leading slashes for relative paths
    return normalized.replace(/^\/+/, '');
  }

  getFileExtension(path) {
    const match = path.match(/\.[^./\\]+$/);
    return match ? match[0] : null;
  }

  logStepDecision(intent, step, result) {
    const logEntry = {
      timestamp: result.timestamp,
      intentId: intent.id,
      agentRole: intent.agentRole,
      stepId: step.stepId,
      action: step.action,
      target: step.target?.path || step.target,
      purpose: step.purpose,
      decision: result.decision,
      reason: result.reason,
      checksPerformed: result.checks.length,
      checksSummary: result.checks.map(c => `${c.check}:${c.passed ? 'PASS' : 'FAIL'}`)
    };

    this.auditLogger.logStepDecision(logEntry);

    if (this.verbose) {
      const icon = result.decision === 'ALLOWED' ? '✅' : '❌';
      console.log(`\n${icon} Step ${step.stepId}: ${step.action} → ${result.decision}`);
      console.log(`   Target: ${step.target?.path || step.target}`);
      console.log(`   Reason: ${result.reason}`);
      if (result.decision === 'BLOCKED') {
        console.log(`   Failed check: ${result.checks.find(c => !c.passed)?.check}`);
      }
    }
  }

  /**
   * Check if a role can delegate to another role
   */
  canDelegate(fromRole, toRole) {
    const rolePolicy = this.policies.roles[fromRole];
    if (!rolePolicy) return false;
    
    const canDelegateTo = rolePolicy.permissions.canDelegate || [];
    return canDelegateTo.includes(toRole);
  }

  /**
   * Create a delegation with scope restrictions
   */
  createDelegation(fromRole, toRole, scopeRestrictions) {
    if (!this.canDelegate(fromRole, toRole)) {
      return {
        success: false,
        reason: `Role '${fromRole}' cannot delegate to '${toRole}'`
      };
    }

    const delegation = {
      from: fromRole,
      to: toRole,
      createdAt: new Date().toISOString(),
      scope: {
        allowedPaths: scopeRestrictions.paths || [],
        allowedActions: scopeRestrictions.actions || [],
        validUntil: scopeRestrictions.validUntil || null
      }
    };

    this.auditLogger.logDelegation(delegation);

    return {
      success: true,
      delegation
    };
  }
}

export default PolicyEnforcer;
