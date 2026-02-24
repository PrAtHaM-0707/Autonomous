# 🛡️ ArmorClaw: Scoped Developer Assistant

> **Real OpenClaw + ArmorIQ Integration with Intent-Aware Policy Enforcement**

Built for the **ArmorIQ x OpenClaw Hackathon** — demonstrating how AI agents can act autonomously while remaining strictly aligned with user-defined intent through deterministic policy enforcement.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)
![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.2.23-purple.svg)
![ArmorClaw](https://img.shields.io/badge/ArmorClaw-Plugin%20Loaded-green.svg)
![Status](https://img.shields.io/badge/status-submission%20ready-success.svg)

---

## ⚡ TL;DR - At a Glance

**Problem:** AI agents can make irreversible mistakes when operating on local systems, especially when given vague instructions like *"Clean this up."*

**Solution:** A fail-closed, two-layer enforcement system that strictly separates reasoning from execution.

**How it works:**
1. 🧠 **LLM generates** a structured JSON intent plan (never executes directly).
2. 🔐 **ArmorIQ SDK** captures the plan and issues a cryptographic intent token.
3. 🛡️ **PolicyEnforcer** validates every step against declarative role/path rules.
4. ⚙️ **ToolExecutor** runs *only* the explicitly validated actions.

### 🚀 How to Run

**Method 1: Interactive Standalone Demo**
We built a rich, interactive CLI demo that accurately simulates the OpenClaw gateway routing and ArmorIQ cryptographic token validation locally. This is the easiest way to evaluate our intent validation logic.
\`\`\`bash
npm install @armoriq/sdk uuid minimatch chalk
node src/setup-workspace.js
node src/interactive-demo.js
\`\`\`

**Method 2: Full OpenClaw Gateway Integration**
Our agent logic is designed to plug directly into the OpenClaw framework.
1. Install OpenClaw (`curl -fsSL https://armoriq.ai/install-armorclaw.sh | bash`)
2. Start the gateway: `cd ~/openclaw-armoriq && pnpm dev gateway`
3. Our agent connects via the handler in `src/openclaw-agent.js`, intercepting tool calls and enforcing the policies defined in our `config/` directory.