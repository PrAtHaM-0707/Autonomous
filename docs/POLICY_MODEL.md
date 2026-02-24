# Policy Model Documentation

## Overview

The Policy Model defines the rules and constraints that govern what each agent is allowed to do. It implements role-based access control with path-scoped permissions.

## Why a Structured Policy Model?

The hackathon problem statement requires:
> "A policy model with enforceable constraints"

And explicitly states:
> "Hardcoded if-else checks without structured intent validation will not be considered sufficient."

Our policy model provides:
1. **Declarative rules** in JSON format
2. **Role-based access control** with different permission levels
3. **Path scoping** using glob patterns
4. **Composable constraints** that can be combined
5. **Dynamic evaluation** at runtime

## Policy Schema

```json
{
  "version": "1.0.0",
  "defaultDeny": true,
  "roles": {
    "role-name": {
      "description": "Human-readable description",
      "permissions": {
        "tools": {
          "allow": ["list", "of", "tools"],
          "deny": ["blocked", "tools"]
        },
        "paths": {
          "allow": ["glob/patterns/**"],
          "deny": ["blocked/paths/**"]
        },
        "constraints": {
          "maxFileSize": "100KB",
          "allowedExtensions": [".js", ".ts"],
          "readOnly": false,
          "maxOperationsPerIntent": 10
        },
        "canDelegate": ["other-role"]
      }
    }
  },
  "globalConstraints": {
    "deniedPatterns": ["**/.env", "**/secrets/**"],
    "maxIntentValiditySeconds": 300
  }
}
```

## Role Definitions

### Lead Agent
```json
{
  "lead-agent": {
    "description": "Lead developer agent with full project access and delegation authority",
    "permissions": {
      "tools": {
        "allow": ["read_file", "write_file", "list_dir", "delegate"],
        "deny": ["bash", "exec", "delete_file"]
      },
      "paths": {
        "allow": ["workspace/project/**"],
        "deny": []
      },
      "canDelegate": ["refactor-agent", "review-agent"]
    }
  }
}
```

**Capabilities:**
- ✅ Read any project file
- ✅ Write any project file
- ✅ Delegate tasks to other agents
- ❌ Cannot execute shell commands
- ❌ Cannot delete files

### Refactor Agent
```json
{
  "refactor-agent": {
    "description": "Code refactoring agent - scoped to components and utils",
    "permissions": {
      "tools": {
        "allow": ["read_file", "write_file", "list_dir"],
        "deny": ["bash", "exec", "delete_file", "web_fetch", "delegate"]
      },
      "paths": {
        "allow": [
          "workspace/project/src/components/**",
          "workspace/project/src/utils/**"
        ],
        "deny": [
          "workspace/project/auth/**",
          "workspace/project/config/**",
          "workspace/project/.env*"
        ]
      },
      "constraints": {
        "maxFileSize": "100KB",
        "allowedExtensions": [".js", ".jsx", ".ts", ".tsx", ".css"]
      }
    }
  }
}
```

**Capabilities:**
- ✅ Read/write in `src/components/`
- ✅ Read/write in `src/utils/`
- ❌ Cannot access `auth/` directory
- ❌ Cannot access `config/` directory
- ❌ Cannot delegate to other agents

### Review Agent
```json
{
  "review-agent": {
    "description": "Code review agent - read-only access",
    "permissions": {
      "tools": {
        "allow": ["read_file", "list_dir"],
        "deny": ["write_file", "delete_file", "bash", "exec"]
      },
      "paths": {
        "allow": ["workspace/project/**"],
        "deny": ["workspace/project/.env*", "workspace/project/secrets/**"]
      },
      "constraints": {
        "readOnly": true
      }
    }
  }
}
```

**Capabilities:**
- ✅ Read any project file (except secrets)
- ✅ List any directory
- ❌ Cannot write any files
- ❌ Cannot execute commands

## Path Pattern Matching

We use glob patterns for path matching (powered by `minimatch`):

| Pattern | Matches |
|---------|---------|
| `src/components/**` | All files in components and subdirectories |
| `**/*.js` | All JavaScript files anywhere |
| `config/*.yml` | YAML files directly in config folder |
| `**/.env*` | All .env files anywhere |
| `!auth/**` | Negation (exclude auth folder) |

### Example Evaluations

```
Path: workspace/project/src/components/Button.jsx
Allow: workspace/project/src/components/**
Result: ✅ ALLOWED (matches allow pattern)

Path: workspace/project/auth/login.js
Allow: workspace/project/src/components/**
Deny: workspace/project/auth/**
Result: ❌ BLOCKED (matches deny pattern)

Path: workspace/project/.env
Deny: workspace/project/.env*
Result: ❌ BLOCKED (matches deny pattern)
```

## Constraint Types

### Tool Constraints
```json
{
  "tools": {
    "allow": ["read_file", "write_file"],
    "deny": ["bash", "exec"]
  }
}
```
- **allow**: Tools the role can use
- **deny**: Tools explicitly blocked (checked first)

### Path Constraints
```json
{
  "paths": {
    "allow": ["workspace/project/src/**"],
    "deny": ["workspace/project/src/secrets/**"]
  }
}
```
- **deny takes precedence**: If a path matches both allow and deny, it's denied
- **defaultDeny**: If no allow pattern matches, access is denied

### Additional Constraints
```json
{
  "constraints": {
    "maxFileSize": "100KB",
    "allowedExtensions": [".js", ".ts"],
    "readOnly": true,
    "maxOperationsPerIntent": 10
  }
}
```

| Constraint | Description |
|------------|-------------|
| `maxFileSize` | Maximum file size for write operations |
| `allowedExtensions` | File types the role can modify |
| `readOnly` | If true, blocks all write operations |
| `maxOperationsPerIntent` | Maximum steps per intent plan |

### Delegation Constraints
```json
{
  "canDelegate": ["refactor-agent", "review-agent"]
}
```
- Lists roles this role can delegate tasks to
- Empty array means no delegation allowed

## Global Constraints

Applied to ALL roles regardless of their individual permissions:

```json
{
  "globalConstraints": {
    "deniedPatterns": [
      "**/.env",
      "**/.env.*",
      "**/secrets/**",
      "**/*.pem",
      "**/*.key"
    ],
    "maxIntentValiditySeconds": 300
  }
}
```

**Global deniedPatterns** block access for ALL agents:
- `.env` files (environment secrets)
- `secrets/` directories
- Private keys and certificates

## Enforcement Order

The PolicyEnforcer checks constraints in this order:

1. **Tool Deny Check**: Is the action in the deny list?
2. **Tool Allow Check**: Is the action in the allow list?
3. **Global Deny Check**: Does the path match global deny patterns?
4. **Path Deny Check**: Does the path match role's deny patterns?
5. **Path Allow Check**: Does the path match role's allow patterns?
6. **Delegation Scope Check**: If delegated, is action within scope?
7. **Read-Only Check**: Is role read-only and action is write?
8. **Extension Check**: Is file extension allowed?

**First failure blocks the action.** All checks must pass.

## Policy Evaluation Example

```
Intent: refactor-agent wants to write to /auth/login.js

Check 1: tool-deny-list
  Action: write_file
  Deny list: [bash, exec, delete_file, web_fetch, delegate]
  Result: ✅ PASS (write_file not in deny list)

Check 2: tool-allow-list
  Action: write_file
  Allow list: [read_file, write_file, list_dir]
  Result: ✅ PASS (write_file in allow list)

Check 3: global-deny-pattern
  Path: workspace/project/auth/login.js
  Global deny: [**/.env, **/secrets/**]
  Result: ✅ PASS (no match)

Check 4: path-deny-list
  Path: workspace/project/auth/login.js
  Role deny: [workspace/project/auth/**, ...]
  Result: ❌ FAIL (matches auth/**)

Final Decision: ❌ BLOCKED
Reason: Path 'workspace/project/auth/login.js' matches deny pattern 'workspace/project/auth/**' for role 'refactor-agent'
```

## Policy File Location

Configuration: `config/policies.json`
JSON Schema: `src/schemas/policy.schema.json`

## Dynamic Policy Updates

While not implemented in this demo, the architecture supports:
- Loading policies from external sources
- Runtime policy updates
- Policy versioning
- Policy inheritance

## Best Practices

1. **Principle of Least Privilege**: Give each role only the permissions it needs
2. **Explicit Deny**: Always explicitly deny sensitive paths
3. **Global Constraints**: Use global constraints for secrets that no role should access
4. **Audit Everything**: Log all policy decisions for compliance
5. **Test Policies**: Verify both allowed and blocked scenarios
