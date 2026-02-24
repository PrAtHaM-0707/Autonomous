/**
 * IntentBuilder - Creates structured intent plans from user prompts
 * 
 * This class transforms natural language prompts into structured
 * intent plans that can be validated by the PolicyEnforcer.
 */

import { v4 as uuidv4 } from 'uuid';

export class IntentBuilder {
  constructor(agentRole = 'refactor-agent') {
    this.agentRole = agentRole;
  }

  /**
   * Create a new intent plan
   */
  createIntent(userPrompt, goal, steps) {
    const intent = {
      id: `intent-${uuidv4()}`,
      timestamp: new Date().toISOString(),
      userPrompt,
      goal,
      agentRole: this.agentRole,
      steps: steps.map((step, index) => ({
        stepId: index + 1,
        ...step
      }))
    };

    return intent;
  }

  /**
   * Create a delegated intent (with scope restrictions)
   */
  createDelegatedIntent(userPrompt, goal, steps, delegation) {
    const intent = this.createIntent(userPrompt, goal, steps);
    intent.delegatedFrom = delegation.from;
    intent.delegationScope = delegation.scope;
    return intent;
  }

  /**
   * Helper to create a read_file step
   */
  static readFile(path, purpose = 'Read file contents') {
    return {
      action: 'read_file',
      target: {
        type: 'file',
        path
      },
      purpose,
      requiredPermissions: ['read']
    };
  }

  /**
   * Helper to create a write_file step
   */
  static writeFile(path, content, purpose = 'Write file contents') {
    return {
      action: 'write_file',
      target: {
        type: 'file',
        path
      },
      content,
      purpose,
      requiredPermissions: ['write']
    };
  }

  /**
   * Helper to create a list_dir step
   */
  static listDir(path, purpose = 'List directory contents') {
    return {
      action: 'list_dir',
      target: {
        type: 'directory',
        path
      },
      purpose,
      requiredPermissions: ['read']
    };
  }

  /**
   * Helper to create a delete_file step
   */
  static deleteFile(path, purpose = 'Delete file') {
    return {
      action: 'delete_file',
      target: {
        type: 'file',
        path
      },
      purpose,
      requiredPermissions: ['delete']
    };
  }

  /**
   * Helper to create a bash/exec step
   */
  static exec(command, purpose = 'Execute command') {
    return {
      action: 'exec',
      target: {
        type: 'command',
        path: command
      },
      purpose,
      requiredPermissions: ['exec']
    };
  }
}

export default IntentBuilder;
