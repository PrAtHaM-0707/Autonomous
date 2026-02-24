# 🛡️ ArmorClaw — Intent-Aware Scoped Developer Assistant  
**ArmorIQ × OpenClaw Hackathon Submission**

A trustworthy autonomous coding agent that performs real actions while remaining strictly aligned with user-defined intent.

ArmorClaw demonstrates how OpenClaw agents can safely refactor code, delegate tasks, and interact with a real filesystem — while ArmorIQ enforces deterministic runtime boundaries.

---

## 🎯 Core Idea

Vague instructions like:

> “Clean this up.”

should never result in accidental deletion of secrets, configs, or authentication logic.

ArmorClaw solves this by separating reasoning from execution and enforcing every action at runtime using structured intent + policy validation.

---

## 🧠 Architecture Summary

Flow:

1. User submits prompt  
2. Lead agent generates structured intent (JSON plan)  
3. ArmorIQ issues cryptographic intent token  
4. Local policy engine validates every step  
5. Executor performs only approved actions  
6. Unauthorized behavior is deterministically blocked and logged  

Roles (simulated via OpenClaw + policies):

- **Lead / Guardian Agent** — planning + delegation  
- **Refactor Executor** — scoped write access  
- **Review Agent** — read-only audit  

Delegation is bounded: executors receive explicit file scope and cannot exceed it.

---

## 🚀 Running the Demo

### Requirements

- Node.js ≥ 22

---

### Method 1 — Local Interactive Demo (Recommended)

Simulates OpenClaw routing + ArmorIQ enforcement locally.

```bash
npm install
node src/setup-workspace.js
node src/interactive-demo.js
```

You will observe:

- Allowed refactors inside `src/components/**`
- Blocked access to `.env`, `auth/`, `config/`
- Full audit logging in `logs/audit.jsonl`

---

### Method 2 — OpenClaw Gateway Integration

1. Install ArmorClaw + OpenClaw:

```bash
curl -fsSL https://armoriq.ai/install-armorclaw.sh | bash
```

2. Start gateway:

```bash
cd ~/openclaw-armoriq
pnpm dev gateway
```

3. Run agent:

```bash
node src/openclaw-agent.js
```

ArmorIQ intercepts every tool call and applies policies from `config/`.

---

## 🧩 Intent Model

The LLM never executes directly.

It must first emit a structured intent:

- `id`
- `userPrompt`
- `goal`
- `agentRole`
- `steps[]`
  - `action`
  - `target`
  - `purpose`

ArmorIQ cryptographically binds this plan (hash + token) to prevent intent drift.

---

## 🔒 Policy Model

Defined declaratively in `config/policies.json`.

### Allowed Paths
- `src/components/**`
- `src/utils/**`

### Denied Paths
- `auth/**`
- `config/**`
- `**/.env*`
- `secrets/**`

Additional controls:

- Tool allow/deny lists  
- Role-based access (RBAC)  
- Delegation scope limits  
- Max operations per intent  

No hardcoded `if/else`.  
All enforcement is policy driven.

---

## 🛡️ Enforcement Layers

### Layer 1 — ArmorIQ Intent Verification  
Ensures tool calls match the original cryptographic plan.  
Intent drift → instant block.

### Layer 2 — Local Policy Enforcer  
Validates:

- tool  
- role  
- path  
- delegation scope  

Decision is deterministic.

---

## ✅ Demonstrated Scenarios

### Allowed

- Refactor `src/components/Button.jsx`
- Update `src/components/Header.jsx`

### Blocked

- Writing to `auth/**`
- Reading `.env`
- Modifying files outside delegated scope

Blocked actions produce visible policy-deny logs.

---

## 📁 Project Structure

```
src/core/        Intent, policy, execution logic
src/openclaw-agent.js
config/          Policies and OpenClaw config
workspace/       Sample project directory
docs/            Architecture + models
logs/            Audit trail
```

---

## 🏁 Hackathon Goals Met

- Autonomous OpenClaw agent  
- Real filesystem execution  
- Structured intent model  
- Runtime policy enforcement  
- Observable blocking  
- Bounded delegation  
- Audit logging  
