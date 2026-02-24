# 🛡️ ArmorClaw Scoped Developer Assistant
**ARMORIQ x OPENCLAW Hackathon Submission**

**Tagline:** A trustworthy, intent-aware autonomous coding agent that never loses control — even with vague instructions.

---

## 1. Separation Between Reasoning and Execution
To guarantee deterministic safety, ArmorClaw strictly decouples *what* the agent wants to do (Reasoning) from *how* and *if* it actually happens (Execution). 

Our system operates in three distinct phases:
1. **Phase 1: Intent Planning (Reasoning):** The OpenClaw LLM processes the user prompt and generates a structured, multi-step JSON plan. *No actions are executed in this phase.*
2. **Phase 2: Intent & Policy Validation (Enforcement):** The plan is sent to the ArmorIQ SDK via `capturePlan()`. We receive a cryptographic intent token via `getIntentToken()`. Our local `PolicyEnforcer` then evaluates every step of the plan against strict path and tool rules.
3. **Phase 3: Tool Execution (Action):** Only steps that receive an `ALLOWED` decision from the enforcement layer are passed to the `ToolExecutor` to interact with the local filesystem.

## 2. Intent Model
Our structured intent model ensures the agent cannot execute unbounded actions. Instead of a free-flowing text stream, the LLM must output a rigid JSON structure before any tool is called.

**Intent Structure:**
* `id`: Unique intent identifier
* `userPrompt`: The original human request
* `goal`: The high-level objective
* `agentRole`: The identity of the agent (e.g., `lead-agent`, `refactor-agent`)
* `steps`: An array of explicit, bounded actions. Each step contains:
  * `action`: The exact tool requested (e.g., `read_file`, `write_file`)
  * `target`: The specific resource path (e.g., `src/components/Button.jsx`)
  * `purpose`: Human-readable rationale for the action

This structure is cryptographically bound using the **ArmorIQ SDK**, generating a SHA-256 `plan_hash` and Merkle tree proofs to prevent runtime Intent Drift.

## 3. Policy Model
ArmorClaw implements a robust, Role-Based Access Control (RBAC) policy model that uses glob patterns for strict boundary enforcement. Instead of hardcoded `if/else` checks, the system loads a `policies.json` configuration.

**Key Policy Constraints:**
* **Tool Restrictions:** Allow/Deny lists for specific tools (e.g., `delete_file` and `bash` are globally denied for standard agents).
* **Path Scoping:** Strict allow/deny glob patterns. 
  * *Allowed:* `src/components/**`, `src/utils/**`
  * *Denied:* `auth/**`, `config/**`, `**/.env*`, `secrets/**`
* **Constraints:** Limits on `maxOperationsPerIntent` to prevent infinite loops.

## 4. Enforcement Mechanism
Our enforcement mechanism acts as a fail-closed, deterministic firewall between the LLM and the local filesystem, operating in two layers:

1. **Layer 1 (ArmorIQ CSRG Verification):** Uses the ArmorIQ SDK to ensure the agent doesn't deviate from the originally generated plan (Intent Drift). If an agent attempts to call a tool not in the original cryptographic token, it is instantly blocked.
2. **Layer 2 (Local Policy Enforcer):** Evaluates the validated intent against the `policies.json` ruleset. It checks the requested action and target path against the agent's assigned role. 
*All enforcement decisions are persistently logged to `logs/audit.jsonl` for full traceability.*

## 5. Explanation of Allowed Action
**User Prompt:** *"Refactor the Button component"*

**Why it was ALLOWED:**
1. The agent's intent plan proposed a `write_file` action on the target `src/components/Button.jsx`.
2. The `PolicyEnforcer` checked the `lead-agent` role permissions.
3. The `write_file` tool is in the role's allowed tools list.
4. The target path `src/components/Button.jsx` successfully matched the allowed glob pattern `src/components/**`.
5. The action was executed, and the file was updated.

## 6. Explanation of Blocked Actions & Vague Instructions
We demonstrate intent-aware boundary enforcement through two blocked scenarios:

**A. Protected Path Violation:**
* **User Prompt:** *"Update authentication logic"*
* **Why it was BLOCKED:** The agent attempted to use `write_file` on `auth/login.js`. While the tool was allowed, the path matched the strict deny pattern `auth/**`. The action was deterministically blocked, preventing unauthorized changes to critical security files.

**B. Vague Instruction Handling (The "Clean this up" Test):**
* **User Prompt:** *"Clean this up"*
* **Why it was BLOCKED (Partial Execution):** Vague prompts traditionally cause autonomous agents to lose control. In our system, the agent interpreted "clean up" as formatting code AND deleting unnecessary hidden files. 
  * **Step 1:** The agent planned to format `src/components/Header.jsx`. This matched our path policies and was **ALLOWED**.
  * **Step 2:** The agent planned to delete the `.env` file. Our policy explicitly denies the `delete_file` tool and restricts access to `**/.env*`. This step was **BLOCKED**.
* **Result:** Autonomy was maintained for the safe task, while strict intent boundaries deterministically prevented destructive behavior.