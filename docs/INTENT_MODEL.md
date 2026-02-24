# Intent Model Documentation

## Overview

The Intent Model defines the structured format for representing user requests as executable plans that can be validated by the PolicyEnforcer before execution.

## Why a Structured Intent Model?

The hackathon problem statement asks:
> "Each team must define: A structured intent model"

A structured intent model provides:
1. **Explicit representation** of what the agent intends to do
2. **Validation hooks** before any action executes
3. **Audit trail** for compliance and debugging
4. **Scope boundaries** that can be enforced

## Intent Schema

```json
{
  "$schema": "intent-schema-v1",
  "intent": {
    "id": "intent-uuid-12345",
    "timestamp": "2026-02-24T10:30:00Z",
    "userPrompt": "Original user request",
    "goal": "High-level goal derived from prompt",
    "agentRole": "refactor-agent",
    "delegatedFrom": "lead-agent",
    "delegationScope": {
      "allowedPaths": ["..."],
      "allowedActions": ["..."],
      "validUntil": "2026-02-24T11:30:00Z"
    },
    "steps": [
      {
        "stepId": 1,
        "action": "read_file",
        "target": {
          "type": "file",
          "path": "/workspace/project/src/components/Button.jsx"
        },
        "purpose": "Human-readable explanation",
        "requiredPermissions": ["read", "components-scope"]
      }
    ]
  }
}
```

## Field Definitions

### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier in format `intent-{uuid}` |
| `timestamp` | ISO 8601 | Yes | When this intent was created |
| `userPrompt` | string | Yes | Original natural language request from user |
| `goal` | string | Yes | High-level goal derived from the prompt |
| `agentRole` | enum | Yes | Role of the executing agent |
| `delegatedFrom` | string | No | If delegated, the delegating agent |
| `delegationScope` | object | No | Scope restrictions for delegated tasks |
| `steps` | array | Yes | Ordered list of actions to execute |

### Agent Roles

| Role | Description |
|------|-------------|
| `lead-agent` | Full project access, can delegate to other agents |
| `refactor-agent` | Can modify code in allowed directories only |
| `review-agent` | Read-only access to project files |

### Step Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `stepId` | integer | Yes | Sequential step number (1, 2, 3...) |
| `action` | enum | Yes | The tool/action to execute |
| `target` | object | Yes | Target resource for the action |
| `purpose` | string | Yes | Human-readable explanation for audit |
| `content` | string | No | Content for write operations |
| `requiredPermissions` | array | No | Permissions needed for this step |

### Supported Actions

| Action | Description | Target Type |
|--------|-------------|-------------|
| `read_file` | Read file contents | file |
| `write_file` | Write/create file | file |
| `list_dir` | List directory contents | directory |
| `delete_file` | Delete a file | file |
| `bash` | Execute shell command | command |
| `exec` | Execute a program | command |
| `web_fetch` | Fetch URL content | url |
| `delegate` | Delegate to another agent | N/A |

### Target Object

```json
{
  "type": "file",
  "path": "/workspace/project/src/components/Button.jsx"
}
```

| Field | Values |
|-------|--------|
| `type` | `file`, `directory`, `url`, `command` |
| `path` | Target resource path or URL |

## Delegation Scope

When a task is delegated from one agent to another, the delegation scope restricts what the delegated agent can do:

```json
{
  "delegationScope": {
    "allowedPaths": [
      "workspace/project/src/components/Button.jsx"
    ],
    "allowedActions": ["read_file", "write_file"],
    "validUntil": "2026-02-24T11:30:00Z"
  }
}
```

This ensures:
- Delegated agent can only access specified paths
- Delegated agent can only use specified actions
- Delegation expires at specified time

## Example: Complete Intent Plan

```json
{
  "id": "intent-550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-24T10:30:00Z",
  "userPrompt": "Refactor the Button component to use TypeScript",
  "goal": "Convert Button.jsx to TypeScript with proper types",
  "agentRole": "refactor-agent",
  "steps": [
    {
      "stepId": 1,
      "action": "read_file",
      "target": {
        "type": "file",
        "path": "workspace/project/src/components/Button.jsx"
      },
      "purpose": "Read current Button implementation to understand structure",
      "requiredPermissions": ["read"]
    },
    {
      "stepId": 2,
      "action": "write_file",
      "target": {
        "type": "file",
        "path": "workspace/project/src/components/Button.tsx"
      },
      "content": "// TypeScript version...",
      "purpose": "Write refactored Button with TypeScript types",
      "requiredPermissions": ["write"]
    }
  ]
}
```

## Intent Creation in Code

```javascript
import { IntentBuilder } from './core/intent-builder.js';

const agent = new IntentBuilder('refactor-agent');

const intent = agent.createIntent(
  'Refactor the Button component',  // userPrompt
  'Convert to TypeScript',           // goal
  [
    IntentBuilder.readFile(
      'workspace/project/src/components/Button.jsx',
      'Read current implementation'
    ),
    IntentBuilder.writeFile(
      'workspace/project/src/components/Button.tsx',
      '// TypeScript content...',
      'Write TypeScript version'
    )
  ]
);
```

## Validation Flow

1. Intent is created with structured steps
2. PolicyEnforcer receives the intent
3. For each step:
   - Check tool permissions for agent role
   - Check path against allow/deny patterns
   - Check delegation scope (if applicable)
   - Check additional constraints
4. Return validation result with detailed reasoning

## Schema Location

Full JSON Schema: `src/schemas/intent.schema.json`
