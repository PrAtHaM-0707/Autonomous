/**
 * AuditLogger - Logging and traceability for policy decisions
 * 
 * Provides structured logging of all policy enforcement decisions
 * for compliance, debugging, and demonstration purposes.
 */

import fs from 'fs';
import path from 'path';

export class AuditLogger {
  constructor(logPath = './logs/audit.jsonl') {
    this.logPath = logPath;
    this.logs = [];
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Log a plan validation result
   */
  logPlanValidation(planResult) {
    const entry = {
      type: 'PLAN_VALIDATION',
      timestamp: planResult.timestamp,
      intentId: planResult.intentId,
      agentRole: planResult.agentRole,
      goal: planResult.goal,
      overallDecision: planResult.overallDecision,
      totalSteps: planResult.totalSteps,
      allowedSteps: planResult.allowedSteps,
      blockedSteps: planResult.blockedSteps,
      reason: planResult.reason || null
    };

    this.writeLog(entry);
    this.logs.push(entry);
    
    // Print summary to console
    this.printPlanSummary(planResult);
  }

  /**
   * Log an individual step decision
   */
  logStepDecision(stepLog) {
    const entry = {
      type: 'STEP_DECISION',
      ...stepLog
    };

    this.writeLog(entry);
    this.logs.push(entry);
  }

  /**
   * Log a delegation event
   */
  logDelegation(delegation) {
    const entry = {
      type: 'DELEGATION',
      timestamp: delegation.createdAt,
      fromRole: delegation.from,
      toRole: delegation.to,
      scope: delegation.scope
    };

    this.writeLog(entry);
    this.logs.push(entry);

    console.log(`\n🔄 DELEGATION: ${delegation.from} → ${delegation.to}`);
    console.log(`   Allowed paths: ${delegation.scope.allowedPaths.join(', ') || 'all'}`);
    console.log(`   Allowed actions: ${delegation.scope.allowedActions.join(', ') || 'all'}`);
    if (delegation.scope.validUntil) {
      console.log(`   Valid until: ${delegation.scope.validUntil}`);
    }
  }

  /**
   * Log an execution event (after policy check passes)
   */
  logExecution(executionLog) {
    const entry = {
      type: 'EXECUTION',
      timestamp: new Date().toISOString(),
      ...executionLog
    };

    this.writeLog(entry);
    this.logs.push(entry);
  }

  /**
   * Write log entry to file
   */
  writeLog(entry) {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logPath, line);
  }

  /**
   * Print plan validation summary to console
   */
  printPlanSummary(planResult) {
    console.log('\n' + '='.repeat(70));
    console.log('INTENT PLAN VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Intent ID:    ${planResult.intentId}`);
    console.log(`Agent Role:   ${planResult.agentRole}`);
    console.log(`Goal:         ${planResult.goal}`);
    console.log('-'.repeat(70));
    console.log(`Total Steps:  ${planResult.totalSteps}`);
    console.log(`Allowed:      ${planResult.allowedSteps} ✅`);
    console.log(`Blocked:      ${planResult.blockedSteps} ❌`);
    console.log('-'.repeat(70));
    
    const decisionIcon = {
      'ALLOWED': '✅',
      'BLOCKED': '❌',
      'PARTIAL': '⚠️'
    }[planResult.overallDecision];
    
    console.log(`DECISION:     ${decisionIcon} ${planResult.overallDecision}`);
    
    if (planResult.reason) {
      console.log(`Reason:       ${planResult.reason}`);
    }
    console.log('='.repeat(70) + '\n');
  }

  /**
   * Generate a human-readable audit report
   */
  generateReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      totalEvents: this.logs.length,
      planValidations: this.logs.filter(l => l.type === 'PLAN_VALIDATION').length,
      stepDecisions: this.logs.filter(l => l.type === 'STEP_DECISION').length,
      delegations: this.logs.filter(l => l.type === 'DELEGATION').length,
      executions: this.logs.filter(l => l.type === 'EXECUTION').length,
      blockedActions: this.logs.filter(l => l.type === 'STEP_DECISION' && l.decision === 'BLOCKED'),
      allowedActions: this.logs.filter(l => l.type === 'STEP_DECISION' && l.decision === 'ALLOWED')
    };

    return report;
  }

  /**
   * Print detailed step-by-step log for demo
   */
  printDetailedLog(stepResult) {
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log(`│ POLICY CHECK: Step ${stepResult.stepId}`.padEnd(66) + '│');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log(`│ Action: ${stepResult.action}`.padEnd(66) + '│');
    console.log(`│ Target: ${stepResult.target}`.padEnd(66) + '│');
    console.log(`│ Purpose: ${stepResult.purpose?.substring(0, 50) || 'N/A'}`.padEnd(66) + '│');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ Checks Performed:'.padEnd(66) + '│');
    
    for (const check of stepResult.checks || []) {
      const icon = check.passed ? '✓' : '✗';
      const status = check.passed ? 'PASS' : 'FAIL';
      console.log(`│   ${icon} ${check.check}: ${status}`.padEnd(66) + '│');
    }
    
    console.log('├─────────────────────────────────────────────────────────────────┤');
    const decisionIcon = stepResult.decision === 'ALLOWED' ? '✅' : '❌';
    console.log(`│ DECISION: ${decisionIcon} ${stepResult.decision}`.padEnd(66) + '│');
    console.log(`│ Reason: ${stepResult.reason?.substring(0, 53) || 'N/A'}`.padEnd(66) + '│');
    console.log('└─────────────────────────────────────────────────────────────────┘');
  }

  /**
   * Get all logs
   */
  getLogs() {
    return this.logs;
  }

  /**
   * Clear logs (for testing)
   */
  clearLogs() {
    this.logs = [];
  }
}

export default AuditLogger;
