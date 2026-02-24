/**
 * AgentOrchestrator - Intent-Aware Autonomous Agent with ArmorIQ Integration
 * 
 * This class coordinates between:
 * - Intent Planning (LLM generates structured plans)
 * - ArmorIQ Integration (cryptographic tokens + backend verification)
 * - Policy Enforcement (validates plans before execution)
 * - Tool Execution (performs validated actions)
 * 
 * Uses the REAL @armoriq/sdk for cryptographic intent verification.
 */

import { PolicyEnforcer } from './policy-enforcer.js';
import { IntentBuilder } from './intent-builder.js';
import { ToolExecutor } from './tool-executor.js';
import { AuditLogger } from './audit-logger.js';
import { ArmorIQIntegration } from './armoriq-integration.js';
import fs from 'fs';
import path from 'path';

export class AgentOrchestrator {
  constructor(config) {
    this.config = config;
    this.workspaceRoot = config.workspaceRoot;
    this.armoriqEnabled = !!config.armoriq?.apiKey;
    
    // Load policy configuration
    const policyConfig = this.loadPolicyConfig(config.policyPath);
    
    // Determine log file path (handle both directory and file paths)
    const logDir = config.logPath || './logs';
    const logFilePath = logDir.endsWith('.jsonl') ? logDir : path.join(logDir, 'audit.jsonl');
    
    // Initialize components
    this.auditLogger = new AuditLogger(logFilePath);
    this.policyEnforcer = new PolicyEnforcer(policyConfig, {
      workspaceRoot: this.workspaceRoot,
      logPath: logFilePath,
      verbose: config.verbose ?? true
    });
    this.toolExecutor = new ToolExecutor(this.workspaceRoot, this.auditLogger);
    
    // Initialize ArmorIQ integration (uses real @armoriq/sdk)
    if (this.armoriqEnabled) {
      this.armoriq = new ArmorIQIntegration({
        apiKey: config.armoriq.apiKey,
        userId: config.armoriq.userId || 'hackathon-user',
        agentId: config.armoriq.agentId || 'scoped-dev-assistant',
        contextId: config.armoriq.contextId || 'default',
        validitySeconds: config.armoriq.validitySeconds || 300,
        verbose: config.verbose ?? true,
      }, this.auditLogger);
    } else {
      this.armoriq = null;
    }
    
    // Agent instances
    this.agents = {
      'lead-agent': new IntentBuilder('lead-agent'),
      'refactor-agent': new IntentBuilder('refactor-agent'),
      'review-agent': new IntentBuilder('review-agent'),
      'scoped-dev-assistant': new IntentBuilder('scoped-dev-assistant')
    };
  }

  loadPolicyConfig(policyPath) {
    const fullPath = path.resolve(policyPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Policy config not found: ${fullPath}`);
    }
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  }

  /**
   * Process an intent object (convenience wrapper for executeIntent)
   * Takes a structured intent object and extracts fields for execution
   */
  async processIntent(intent) {
    return await this.executeIntent(
      intent.agentRole,
      intent.userPrompt,
      intent.goal,
      intent.steps
    );
  }

  /**
   * Execute an intent plan with full policy enforcement
   * 
   * When ArmorIQ API key is provided:
   * 1. Captures plan with ArmorIQ
   * 2. Gets cryptographic intent token
   * 3. Validates each step against token AND policies
   * 4. Executes only if both pass
   */
  async executeIntent(agentRole, userPrompt, goal, steps) {
    console.log('\n' + '═'.repeat(70));
    console.log('ARMORCLAW SCOPED DEVELOPER ASSISTANT');
    console.log(this.armoriqEnabled ? '🔐 ARMORIQ CRYPTOGRAPHIC VERIFICATION' : '🛡️  POLICY ENFORCEMENT');
    console.log('═'.repeat(70));
    console.log(`\n📋 User Request: "${userPrompt}"`);
    console.log(`🤖 Agent: ${agentRole}`);
    console.log(`🎯 Goal: ${goal}`);
    
    // Step 1: Create structured intent plan (REASONING)
    console.log('\n--- PHASE 1: INTENT PLANNING (Reasoning) ---');
    const agent = this.agents[agentRole];
    if (!agent) {
      throw new Error(`Unknown agent role: ${agentRole}`);
    }
    
    const intent = agent.createIntent(userPrompt, goal, steps);
    console.log(`Generated Intent ID: ${intent.id}`);
    console.log(`Steps in plan: ${intent.steps.length}`);
    
    // Step 2a: Get cryptographic token from ArmorIQ (if enabled)
    let intentToken = null;
    if (this.armoriqEnabled) {
      console.log('\n--- PHASE 2a: ARMORIQ TOKENIZATION ---');
      try {
        const tokenResult = await this.armoriq.captureAndTokenize(intent);
        intentToken = tokenResult.intentToken;
        console.log(`   Token ID: ${tokenResult.tokenId}`);
      } catch (error) {
        console.error(`   ❌ ArmorIQ tokenization failed: ${error.message}`);
        console.log('   Falling back to policy-only enforcement');
      }
    }
    
    // Step 2b: Validate intent against policies (ENFORCEMENT)
    console.log('\n--- PHASE 2b: POLICY VALIDATION (Enforcement) ---');
    const validationResult = this.policyEnforcer.validateIntentPlan(intent);
    
    // Step 3: Execute allowed steps (EXECUTION)
    console.log('\n--- PHASE 3: TOOL EXECUTION (Action) ---');
    const executionResults = [];
    
    for (let i = 0; i < intent.steps.length; i++) {
      const step = intent.steps[i];
      const stepValidation = validationResult.stepResults[i];
      
      // Check ArmorIQ token verification (if enabled)
      let armoriqVerified = true;
      if (this.armoriqEnabled && intentToken) {
        const armoriqResult = await this.armoriq.verifyStep(intent.id, step);
        armoriqVerified = armoriqResult.verified;
        if (!armoriqVerified) {
          console.log(`\n⛔ ARMORIQ BLOCKED Step ${step.stepId}: ${step.action}`);
          console.log(`   Reason: ${armoriqResult.reason}`);
          executionResults.push({
            stepId: step.stepId,
            action: step.action,
            executed: false,
            blocked: true,
            blockedBy: 'armoriq',
            reason: armoriqResult.reason
          });
          continue;
        }
      }
      
      // Check policy enforcement
      if (stepValidation.decision === 'ALLOWED') {
        console.log(`\n▶ Executing Step ${step.stepId}: ${step.action}`);
        const execResult = await this.toolExecutor.executeStep(step, stepValidation);
        executionResults.push(execResult);
      } else {
        console.log(`\n⛔ POLICY BLOCKED Step ${step.stepId}: ${step.action}`);
        console.log(`   Reason: ${stepValidation.reason}`);
        executionResults.push({
          stepId: step.stepId,
          action: step.action,
          executed: false,
          blocked: true,
          blockedBy: 'policy',
          reason: stepValidation.reason
        });
      }
    }
    
    // Invalidate token after execution
    if (this.armoriqEnabled && intentToken) {
      this.armoriq.invalidateToken(intent.id);
    }
    
    // Summary
    this.printExecutionSummary(intent, validationResult, executionResults);
    
    return {
      intent,
      validation: validationResult,
      execution: executionResults,
      armoriqEnabled: this.armoriqEnabled,
      tokenId: intentToken?.tokenId || null,
    };
  }

  /**
   * Execute a delegated task with additional scope restrictions
   */
  async executeDelegatedIntent(fromRole, toRole, userPrompt, goal, steps, scopeRestrictions) {
    console.log('\n' + '═'.repeat(70));
    console.log('DELEGATION FLOW');
    console.log(this.armoriqEnabled ? '🔐 ARMORIQ DELEGATION' : '🛡️  POLICY DELEGATION');
    console.log('═'.repeat(70));
    
    // Create delegation via policy enforcer
    const delegationResult = this.policyEnforcer.createDelegation(fromRole, toRole, scopeRestrictions);
    
    if (!delegationResult.success) {
      console.log(`❌ Delegation failed: ${delegationResult.reason}`);
      return { success: false, reason: delegationResult.reason };
    }
    
    // Create delegated intent
    const agent = this.agents[toRole];
    const intent = agent.createDelegatedIntent(
      userPrompt,
      goal,
      steps,
      delegationResult.delegation
    );
    
    console.log(`\n📋 Delegated Request: "${userPrompt}"`);
    console.log(`🔄 From: ${fromRole} → To: ${toRole}`);
    console.log(`🎯 Goal: ${goal}`);
    
    // If ArmorIQ is enabled, create real delegation token
    let armoriqDelegation = null;
    if (this.armoriqEnabled) {
      console.log('\n--- ARMORIQ DELEGATION TOKEN ---');
      // First need a parent token - create one for the lead agent
      const parentIntent = new IntentBuilder(fromRole).createIntent(
        `Delegate: ${userPrompt}`,
        `Delegation to ${toRole}`,
        steps
      );
      
      try {
        const parentToken = await this.armoriq.captureAndTokenize(parentIntent);
        armoriqDelegation = await this.armoriq.createDelegation(
          parentIntent.id,
          toRole,
          {
            allowedActions: scopeRestrictions.actions,
            validitySeconds: 1800,
            subtask: goal,
          }
        );
        
        if (armoriqDelegation.success) {
          console.log(`   ✅ Delegation token created`);
        }
      } catch (error) {
        console.error(`   ⚠️  ArmorIQ delegation failed: ${error.message}`);
      }
    }
    
    // Validate and execute with delegation scope
    console.log('\n--- VALIDATING WITH DELEGATION SCOPE ---');
    const validationResult = this.policyEnforcer.validateIntentPlan(intent);
    
    // Execute allowed steps
    const executionResults = [];
    for (let i = 0; i < intent.steps.length; i++) {
      const step = intent.steps[i];
      const stepValidation = validationResult.stepResults[i];
      
      if (stepValidation.decision === 'ALLOWED') {
        console.log(`\n▶ Executing Step ${step.stepId}: ${step.action}`);
        const execResult = await this.toolExecutor.executeStep(step, stepValidation);
        executionResults.push(execResult);
      } else {
        console.log(`\n⛔ BLOCKED Step ${step.stepId}: ${step.action}`);
        console.log(`   Reason: ${stepValidation.reason}`);
        executionResults.push({
          stepId: step.stepId,
          action: step.action,
          executed: false,
          blocked: true,
          reason: stepValidation.reason
        });
      }
    }
    
    this.printExecutionSummary(intent, validationResult, executionResults);
    
    return {
      delegation: delegationResult.delegation,
      armoriqDelegation: armoriqDelegation,
      intent,
      validation: validationResult,
      execution: executionResults,
      armoriqEnabled: this.armoriqEnabled,
    };
  }

  printExecutionSummary(intent, validation, execution) {
    console.log('\n' + '═'.repeat(70));
    console.log('EXECUTION SUMMARY');
    console.log('═'.repeat(70));
    
    const executed = execution.filter(e => e.executed && e.success).length;
    const blocked = execution.filter(e => e.blocked).length;
    const failed = execution.filter(e => e.executed && !e.success).length;
    
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Executed successfully: ${executed}`);
    console.log(`   ❌ Blocked by policy:     ${blocked}`);
    console.log(`   ⚠️  Execution failed:      ${failed}`);
    
    if (this.armoriqEnabled) {
      console.log(`\n🔐 ArmorIQ Verification: ACTIVE`);
      console.log(`   Cryptographic tokens used for intent verification`);
    }
    
    if (blocked > 0) {
      console.log(`\n🛡️  POLICY ENFORCEMENT DEMONSTRATION:`);
      console.log(`   ${blocked} action(s) were blocked.`);
      console.log(`   This shows deterministic enforcement of intent boundaries.`);
    }
    
    console.log('\n' + '═'.repeat(70) + '\n');
  }

  /**
   * Cleanup resources
   */
  async close() {
    if (this.armoriq) {
      await this.armoriq.close();
    }
  }
}

export default AgentOrchestrator;
