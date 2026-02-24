# Enforcement Mechanism Documentation

## Overview

This document explains how policy enforcement works in the ArmorClaw Scoped Developer Assistant, demonstrating the clear separation between reasoning and execution.

## Two-Layer Enforcement Architecture

Our system implements defense-in-depth with two enforcement layers:

```
┌─────────────────────────────────────────────────┐
│             LAYER 1: ArmorIQ Plugin             │
│                                                 │
│  • Cryptographic intent tokens                  │
│  • Tool-level allow/deny                        │
│  • Token expiration                             │
│  • CSRG Merkle tree proofs (optional)           │
│                                                 │
│  Provided by: ArmorIQ platform                  │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│             LAYER 2: PolicyEnforcer             │
│                                                 │
│  • Path-scoped access control                   │
│  • Role-based permissions                       │
│  • Delegation scope enforcement                 │
│  • Custom constraints                           │
│                                                 │
│  Provided by: Your custom code                  │
└─────────────────────────────────────────────────┘
```

## Separation of Concerns

### Reasoning Layer (LLM)
- Analyzes user prompts
- Generates structured intent plans
- **NEVER executes directly**
- Outputs: Intent plan with steps

### Validation Layer (PolicyEnforcer)
- Receives intent plans
- Validates each step against policies
- Logs all decisions
- Outputs: Validation result (ALLOWED/BLOCKED per step)

### Execution Layer (ToolExecutor)
- Receives validated steps
- Executes ONLY if validation passed
- Performs actual filesystem operations
- Outputs: Execution results

```
USER REQUEST
     │
     ▼
┌─────────────┐
│   LLM       │ ─── REASONING (no execution)
│ (Planning)  │
└─────────────┘
     │
     │ Intent Plan
     ▼
┌─────────────┐
│  Policy     │ ─── VALIDATION (check rules)
│  Enforcer   │
└─────────────┘
     │
     │ Validation Result
     ▼
┌─────────────┐
│   Tool      │ ─── EXECUTION (if allowed)
│  Executor   │
└─────────────┘
     │
     ▼
FILE SYSTEM
```

## Enforcement Checks

The PolicyEnforcer performs these checks in sequence for each step:

### Check 1: Tool Deny List
```javascript
checkToolDeny(action, toolPolicy) {
  const denied = toolPolicy.deny.includes(action);
  return {
    check: 'tool-deny-list',
    passed: !denied,
    reason: denied 
      ? `Tool '${action}' is in deny list`
      : `Tool '${action}' not in deny list`
  };
}
```

### Check 2: Tool Allow List
```javascript
checkToolAllow(action, toolPolicy) {
  const allowed = toolPolicy.allow.includes(action);
  return {
    check: 'tool-allow-list',
    passed: allowed,
    reason: allowed
      ? `Tool '${action}' is in allow list`
      : `Tool '${action}' not in allow list`
  };
}
```

### Check 3: Global Deny Patterns
```javascript
checkGlobalDeny(path) {
  const globalPatterns = this.policies.globalConstraints?.deniedPatterns || [];
  for (const pattern of globalPatterns) {
    if (minimatch(normalizedPath, pattern)) {
      return {
        check: 'global-deny-pattern',
        passed: false,
        reason: `Path matches global deny pattern '${pattern}'`
      };
    }
  }
  return { check: 'global-deny-pattern', passed: true };
}
```

### Check 4: Path Deny List
```javascript
checkPathDeny(path, pathPolicy, role) {
  for (const pattern of pathPolicy.deny) {
    if (minimatch(normalizedPath, pattern)) {
      return {
        check: 'path-deny-list',
        passed: false,
        reason: `Path matches deny pattern for role '${role}'`
      };
    }
  }
  return { check: 'path-deny-list', passed: true };
}
```

### Check 5: Path Allow List
```javascript
checkPathAllow(path, pathPolicy, role) {
  for (const pattern of pathPolicy.allow) {
    if (minimatch(normalizedPath, pattern)) {
      return { check: 'path-allow-list', passed: true };
    }
  }
  // Default deny if no pattern matches
  return {
    check: 'path-allow-list',
    passed: false,
    reason: `Path not in allowed paths for role '${role}'`
  };
}
```

### Check 6: Delegation Scope
```javascript
checkDelegationScope(step, delegationScope) {
  // Check time validity
  if (delegationScope.validUntil) {
    const now = new Date();
    const validUntil = new Date(delegationScope.validUntil);
    if (now > validUntil) {
      return { passed: false, reason: 'Delegation expired' };
    }
  }
  
  // Check action scope
  if (!delegationScope.allowedActions.includes(step.action)) {
    return { passed: false, reason: 'Action not in delegated scope' };
  }
  
  // Check path scope
  // ... path matching logic
}
```

### Check 7: Read-Only Constraint
```javascript
if (permissions.constraints?.readOnly && 
    ['write_file', 'delete_file'].includes(step.action)) {
  return {
    passed: false,
    reason: `Role is read-only, cannot perform '${step.action}'`
  };
}
```

### Check 8: File Extension
```javascript
checkFileExtension(path, allowedExtensions) {
  const ext = getFileExtension(path);
  const allowed = allowedExtensions.includes(ext);
  return {
    check: 'file-extension',
    passed: allowed,
    reason: allowed
      ? `Extension '${ext}' is allowed`
      : `Extension '${ext}' not in allowed list`
  };
}
```

## Fail-Closed Design

**Critical principle**: If any check fails, execution is blocked.

```javascript
// In validateStep()
for (const check of checks) {
  if (!check.passed) {
    result.decision = 'BLOCKED';
    result.reason = check.reason;
    return result;  // Stop immediately
  }
}
```

This ensures:
- No action executes without passing ALL checks
- Unknown situations default to blocking
- Security over functionality

## Deterministic Enforcement

Given the same:
- Intent plan
- Policy configuration
- Current time (for delegation expiry)

The PolicyEnforcer will ALWAYS produce the same decision.

```
Input:
  Intent: write to /auth/login.js
  Role: refactor-agent
  Policy: deny /auth/**

Output: ❌ BLOCKED
  (Always, every time, no exceptions)
```

## Audit Logging

Every decision is logged with full context:

```json
{
  "type": "STEP_DECISION",
  "timestamp": "2026-02-24T10:30:15.123Z",
  "intentId": "intent-550e8400-e29b-41d4-a716-446655440000",
  "agentRole": "refactor-agent",
  "stepId": 2,
  "action": "write_file",
  "target": "workspace/project/auth/login.js",
  "purpose": "Update authentication logic",
  "decision": "BLOCKED",
  "reason": "Path 'workspace/project/auth/login.js' matches deny pattern 'workspace/project/auth/**' for role 'refactor-agent'",
  "checksPerformed": 4,
  "checksSummary": [
    "tool-deny-list:PASS",
    "tool-allow-list:PASS",
    "global-deny-pattern:PASS",
    "path-deny-list:FAIL"
  ]
}
```

## Observable Blocking

When an action is blocked, it's clearly visible:

```
⛔ BLOCKED Step 3: write_file
   Target: workspace/project/auth/login.js
   Reason: Path matches deny pattern 'workspace/project/auth/**' for role 'refactor-agent'
   Failed check: path-deny-list
```

## Demo Scenarios

### Scenario 1: Allowed Action
```
User: "Refactor Button component"
Role: refactor-agent
Action: write_file
Path: workspace/project/src/components/Button.jsx

Checks:
  ✓ tool-deny-list: PASS
  ✓ tool-allow-list: PASS
  ✓ global-deny-pattern: PASS
  ✓ path-deny-list: PASS
  ✓ path-allow-list: PASS (matches src/components/**)

Result: ✅ ALLOWED
→ File is modified
```

### Scenario 2: Blocked Action
```
User: "Also update the auth logic"
Role: refactor-agent
Action: write_file
Path: workspace/project/auth/login.js

Checks:
  ✓ tool-deny-list: PASS
  ✓ tool-allow-list: PASS
  ✓ global-deny-pattern: PASS
  ✗ path-deny-list: FAIL (matches auth/**)

Result: ❌ BLOCKED
→ File unchanged
```

### Scenario 3: Delegation Scope Exceeded
```
Delegation: lead-agent → refactor-agent
Scope: Only Button.jsx allowed

Action: read_file
Path: workspace/project/src/components/Card.jsx

Checks:
  ✓ All role-level checks pass
  ✗ delegation-path-scope: FAIL (not in delegated paths)

Result: ❌ BLOCKED
→ Delegation scope enforced
```

## Code Location

- PolicyEnforcer: `src/core/policy-enforcer.js`
- AuditLogger: `src/core/audit-logger.js`
- ToolExecutor: `src/core/tool-executor.js`
- Demo with all scenarios: `src/demo.js`
