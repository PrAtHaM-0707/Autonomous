/**
 * ToolExecutor - Executes validated tool actions on the filesystem
 * 
 * This class performs real filesystem operations ONLY after
 * the PolicyEnforcer has validated the intent plan.
 * 
 * Architecture flow:
 *   Intent Plan → PolicyEnforcer (validate) → ToolExecutor (execute)
 */

import fs from 'fs';
import path from 'path';

export class ToolExecutor {
  constructor(workspaceRoot, auditLogger) {
    this.workspaceRoot = workspaceRoot;
    this.auditLogger = auditLogger;
  }

  /**
   * Normalize target path (handle both string and object formats)
   */
  getTargetPath(target) {
    return typeof target === 'string' ? target : target?.path;
  }

  /**
   * Execute a validated step
   * @param {Object} step - The step to execute (must be pre-validated)
   * @param {Object} validationResult - The validation result from PolicyEnforcer
   * @returns {Object} Execution result
   */
  async executeStep(step, validationResult) {
    // CRITICAL: Only execute if validation passed
    if (validationResult.decision !== 'ALLOWED') {
      return {
        success: false,
        executed: false,
        reason: `Blocked by policy: ${validationResult.reason}`
      };
    }

    // Normalize target path
    const targetPath = this.getTargetPath(step.target);

    const result = {
      stepId: step.stepId,
      action: step.action,
      target: targetPath,
      success: false,
      executed: true,
      output: null,
      error: null
    };

    try {
      // Map short action names to operations
      const actionMap = {
        'read': 'read_file',
        'write': 'write_file',
        'list': 'list_dir',
      };
      const mappedAction = actionMap[step.action] || step.action;

      switch (mappedAction) {
        case 'read_file':
          result.output = await this.readFile(targetPath);
          result.success = true;
          break;
        
        case 'write_file':
          await this.writeFile(targetPath, step.content);
          result.output = `File written: ${targetPath}`;
          result.success = true;
          break;
        
        case 'list_dir':
          result.output = await this.listDir(targetPath);
          result.success = true;
          break;
        
        default:
          result.success = false;
          result.error = `Unsupported action: ${step.action}`;
      }
    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    // Log execution
    if (this.auditLogger) {
      this.auditLogger.logExecution({
        stepId: step.stepId,
        action: step.action,
        target: targetPath,
        success: result.success,
        error: result.error
      });
    }

    return result;
  }

  /**
   * Resolve path relative to workspace root
   */
  resolvePath(targetPath) {
    // Handle both absolute and relative paths
    const normalizedPath = targetPath.replace(/\\/g, '/');
    
    // If path starts with workspace/project, resolve from workspace root
    if (normalizedPath.startsWith('workspace/project')) {
      return path.join(this.workspaceRoot, normalizedPath.replace('workspace/project', ''));
    }
    
    // If already absolute, use as-is
    if (path.isAbsolute(targetPath)) {
      return targetPath;
    }
    
    // Otherwise resolve relative to workspace
    return path.join(this.workspaceRoot, targetPath);
  }

  /**
   * Read file contents
   */
  async readFile(targetPath) {
    const fullPath = this.resolvePath(targetPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    console.log(`\n📖 READ: ${targetPath}`);
    console.log(`   Size: ${content.length} bytes`);
    return content;
  }

  /**
   * Write file contents
   */
  async writeFile(targetPath, content) {
    const fullPath = this.resolvePath(targetPath);
    const dir = path.dirname(fullPath);
    
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`\n📝 WRITE: ${targetPath}`);
    console.log(`   Size: ${content.length} bytes`);
  }

  /**
   * List directory contents
   */
  async listDir(targetPath) {
    const fullPath = this.resolvePath(targetPath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Directory not found: ${fullPath}`);
    }
    
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const result = entries.map(entry => ({
      name: entry.name,
      type: entry.isDirectory() ? 'directory' : 'file'
    }));
    
    console.log(`\n📁 LIST: ${targetPath}`);
    console.log(`   Entries: ${result.length}`);
    return result;
  }
}

export default ToolExecutor;
