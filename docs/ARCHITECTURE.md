# Architecture Overview

## ArmorClaw Scoped Developer Assistant

This document describes the architecture of our intent-aware autonomous developer assistant built for the ArmorIQ x OpenClaw Hackathon.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                │
│                    (CLI / Telegram / Slack / Discord)                   │
│                                                                         │
│                    "Refactor Button and update auth"                    │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         OPENCLAW GATEWAY                                │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    LLM REASONING LAYER                            │  │
│  │                                                                   │  │
│  │    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐            │  │
│  │    │   Lead      │   │  Refactor   │   │   Review    │            │  │
│  │    │   Agent     │   │   Agent     │   │   Agent     │            │  │
│  │    │  (Full)     │   │ (Scoped)    │   │ (Read-Only) │            │  │
│  │    └──────┬──────┘   └──────┬──────┘   └──────┬──────┘            │  │
│  │           │                 │                 │                   │  │
│  │           └────────────┬────┴────────────────-┘                   │  │
│  │                        │                                          │  │
│  │                        ▼                                          │  │
│  │              ┌─────────────────────┐                              │  │
│  │              │   INTENT BUILDER    │                              │  │
│  │              │   (Structured Plan) │                              │  │
│  │              └──────────┬──────────┘                              │  │
│  └─────────────────────────┼─────────────────────────────────────────┘  │
│                            │                                            │
│                            ▼                                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │              ARMORIQ PLUGIN (Layer 1 Enforcement)                 │  │
│  │                                                                   │  │
│  │    • Captures intent plan from LLM                                │  │
│  │    • Requests cryptographic token from IAP                        │  │
│  │    • Enforces tool-level allow/deny lists                         │  │
│  │    • Blocks execution if token invalid                            │  │
│  └──────────────────────────┬────────────────────────────────────────┘  │
│                             │                                           │
│                             ▼                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │           POLICY ENFORCER (Layer 2 Enforcement)                   │  │
│  │                     [YOUR CUSTOM CODE]                            │  │
│  │                                                                   │  │
│  │    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │    │ Path Scoping │  │ Role-Based   │  │ Delegation   │           │  │
│  │    │  Validation  │  │   Access     │  │   Scope      │           │  │
│  │    └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  │                                                                   │  │
│  │    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │  │
│  │    │  Constraint  │  │   Audit      │  │  Global      │           │  │
│  │    │  Checking    │  │   Logging    │  │   Deny       │           │  │
│  │    └──────────────┘  └──────────────┘  └──────────────┘           │  │
│  └──────────────────────────┬────────────────────────────────────────┘  │
│                             │                                           │
│                    ┌────────┴────────┐                                  │
│                    │                 │                                  │
│                    ▼                 ▼                                  │
│              ┌──────────┐     ┌──────────┐                              │
│              │ ALLOWED  │     │ BLOCKED  │                              │
│              │   ✅     │     │   ❌     │                              │
│              └────┬─────┘     └────┬─────┘                              │
│                   │                │                                    │
│                   ▼                ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      TOOL EXECUTOR                                │  │
│  │                                                                   │  │
│  │    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐          │  │
│  │    │read_file│   │write_   │   │list_dir │   │ (more)  │          │  │
│  │    │         │   │file     │   │         │   │         │          │  │
│  │    └─────────┘   └─────────┘   └─────────┘   └─────────┘          │  │
│  │                                                                   │  │
│  │    Executes ONLY if PolicyEnforcer returns ALLOWED                │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          FILE SYSTEM                                    │
│                                                                         │
│    /workspace/project/                                                  │
│    ├── src/                                                             │
│    │   ├── components/   ✅ ALLOWED for refactor-agent                  │
│    │   │   ├── Button.jsx                                               │
│    │   │   └── Card.jsx                                                 │
│    │   └── utils/        ✅ ALLOWED for refactor-agent                  │
│    │       └── strings.js                                               │
│    ├── auth/             ❌ PROTECTED - blocked for refactor-agent      │
│    │   ├── login.js                                                     │
│    │   └── auth-utils.js                                                │
│    ├── config/           ❌ PROTECTED - blocked for refactor-agent      │
│    │   ├── database.yml                                                 │
│    │   └── app.yml                                                      │
│    └── .env              ❌ GLOBALLY BLOCKED for all agents             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUDIT LOG                                       │
│                                                                         │
│    logs/audit.jsonl                                                     │
│    • Every intent plan validation                                       │
│    • Every step decision (ALLOWED/BLOCKED)                              │
│    • Every execution result                                             │
│    • Full traceability for compliance                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Agent Orchestrator
The main coordinator that ties together intent planning, policy enforcement, and tool execution.

**Location:** `src/core/agent-orchestrator.js`

### 2. Intent Builder
Creates structured intent plans from user prompts. Each plan contains:
- User prompt (original request)
- Goal (high-level objective)
- Agent role (who is executing)
- Steps (ordered list of actions)

**Location:** `src/core/intent-builder.js`

### 3. Policy Enforcer
The custom enforcement layer that validates each step against:
- Tool allow/deny lists (per role)
- Path allow/deny patterns (glob matching)
- Global constraints (e.g., .env files always blocked)
- Delegation scope (if applicable)
- Role-specific constraints (e.g., read-only)

**Location:** `src/core/policy-enforcer.js`

### 4. Tool Executor
Performs actual filesystem operations ONLY after policy validation passes.
Never executes a step that was blocked by the PolicyEnforcer.

**Location:** `src/core/tool-executor.js`

### 5. Audit Logger
Records all decisions with full context for traceability:
- Intent plan validations
- Step-by-step decisions
- Delegation events
- Execution results

**Location:** `src/core/audit-logger.js`

## Two-Layer Enforcement Architecture

### Layer 1: ArmorIQ Plugin (Built-in)
- Cryptographic intent tokens
- Tool-level allow/deny
- Token expiration
- CSRG proofs (optional)

### Layer 2: PolicyEnforcer (Custom)
- Path-scoped access control
- Role-based permissions
- Delegation scope enforcement
- Additional constraints (file extensions, size limits, etc.)

## Data Flow

1. **User sends prompt** → "Refactor Button and update auth"
2. **LLM generates plan** → Structured intent with steps
3. **ArmorIQ captures** → Requests intent token from IAP
4. **PolicyEnforcer validates** → Checks each step against policies
5. **For each step:**
   - If ALLOWED → ToolExecutor executes
   - If BLOCKED → Logged and skipped
6. **Results returned** → With full audit trail

## Security Principles

1. **Fail-Closed**: If validation fails, execution is blocked
2. **Least Privilege**: Each agent has minimal required permissions
3. **Defense in Depth**: Two enforcement layers
4. **Full Auditability**: Every decision is logged
5. **Deterministic**: Same input always produces same decision
