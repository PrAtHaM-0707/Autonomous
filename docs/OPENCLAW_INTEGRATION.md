# 🦞 OpenClaw Integration Guide

## Real OpenClaw + ArmorClaw Setup

This project integrates with **real OpenClaw gateway** and **ArmorClaw security plugin** for production-grade intent enforcement.

---

## 🚀 Quick Start

### 1. **Prerequisites Check**

```bash
# Verify installations
node --version  # Should be >= 22.0.0
openclaw --version  # Should be 2026.2.x
openclaw plugins list | grep armorclaw  # Should show "loaded"
```

### 2. **Configure Environment**

Copy and edit `.env`:
```bash
cp .env.example .env
# Edit .env with your actual API keys
```

Required variables:
```bash
ARMORIQ_API_KEY=ak_live_xxx  # Get from platform.armoriq.ai
GOOGLE_API_KEY=xxx           # For Gemini LLM (or use OpenAI)
```

### 3. **Run Demo**

```bash
# Interactive menu
./run-demo.sh

# Or run directly:
npm run demo:openclaw        # OpenClaw gateway mode
npm run demo:standalone      # Standalone orchestrator mode
npm run demo                 # Original demo (standalone)
```

---

## 🏗️ Architecture: Two Integration Modes

### Mode 1: Real OpenClaw Gateway (Production)

```
User → OpenClaw Gateway → ArmorClaw Plugin → LLM → Intent Plan
                              ↓
                    ArmorIQ IAP (Token)
                              ↓
                    Policy Enforcer → Tool Executor
```

**This is the REAL integration:**
- OpenClaw runs as a gateway service
- ArmorClaw plugin hooks into tool execution
- All enforcement happens automatically through plugin
- Works with Telegram/Slack/Discord bots

**How to run:**
```bash
# Start gateway
./start-openclaw.sh

# In another terminal, send requests
./test-openclaw.sh

# Or use interactive chat
openclaw chat
```

### Mode 2: Standalone Orchestrator (Development/Demo)

```
User → Custom AgentOrchestrator → IntentBuilder → PolicyEnforcer → ToolExecutor
                                         ↓
                                   ArmorIQ SDK
```

**This is for demonstration:**
- Shows the enforcement logic clearly
- Easier to debug and understand
- Same policy enforcement, custom runtime
- Used for hackathon demo videos

**How to run:**
```bash
npm run demo:standalone
# Or
node src/openclaw-agent.js
```

---

## 🔧 OpenClaw Gateway Commands

### Start/Stop Gateway
```bash
# Start (blocking)
openclaw gateway start

# Start in background
openclaw gateway start &

# Stop
openclaw gateway stop

# Restart
openclaw gateway restart
```

### Check Status
```bash
# View logs
openclaw gateway logs

# View logs (live)
openclaw gateway logs -f

# Check plugin status
openclaw plugins list

# Check config
openclaw config get plugins.entries.armorclaw
```

### Send Requests to Gateway

Using curl:
```bash
curl -X POST http://127.0.0.1:8080/chat \
  -H "Authorization: Bearer $OPENCLAW_GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Read src/components/Button.jsx",
    "sessionId": "test-123"
  }'
```

Using OpenClaw CLI:
```bash
openclaw chat --message "Read the Button component"
```

---

## 🧪 Test Scenarios

The `test-openclaw.sh` script runs these tests:

| Test | Action | Expected Result |
|------|--------|----------------|
| 1 | Read `src/components/Button.jsx` | ✅ ALLOWED |
| 2 | Read `auth/login.js` | ❌ BLOCKED (protected path) |
| 3 | Read `.env` | ❌ BLOCKED (globally denied) |
| 4 | Write `src/components/Card.jsx` | ✅ ALLOWED |
| 5 | Execute `bash` command | ❌ BLOCKED (denied tool) |

---

## 🔐 ArmorClaw Plugin Configuration

The plugin is configured in `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "enabled": true,
    "allow": ["armorclaw"],
    "entries": {
      "armorclaw": {
        "enabled": true
      }
    }
  }
}
```

Plugin configuration is passed via **environment variables**:
```bash
export ARMORCLAW_API_KEY="ak_live_xxx"
export ARMORCLAW_USER_ID="hackathon-user"
export ARMORCLAW_AGENT_ID="scoped-dev-assistant"
export ARMORCLAW_CONTEXT_ID="hackathon-demo"
```

Or via the project's [config/openclaw.json](../config/openclaw.json) which can be loaded by your custom agent.

---

## 📁 File Structure

```
armorclaw-scoped-dev-assistant/
├── src/
│   ├── openclaw-agent.js         # Real OpenClaw agent entry point
│   ├── demo.js                   # Original standalone demo
│   └── core/                     # Custom enforcement logic
│       ├── agent-orchestrator.js
│       ├── policy-enforcer.js
│       ├── intent-builder.js
│       ├── tool-executor.js
│       ├── audit-logger.js
│       └── armoriq-integration.js
├── config/
│   ├── policies.json             # Role-based policies
│   ├── openclaw.json             # OpenClaw config for project
│   └── armoriq.config.json       # ArmorIQ settings template
├── workspace/project/            # Test workspace
├── start-openclaw.sh             # Start gateway script
├── test-openclaw.sh              # Test scenarios script
├── run-demo.sh                   # Interactive demo menu
└── .env                          # Environment variables
```

---

## 🎯 Hackathon Demo Flow

### For Live Presentation:

**Option A: Show Real OpenClaw Gateway** (More impressive)
```bash
# Terminal 1: Start gateway
./start-openclaw.sh

# Terminal 2: Run tests
./test-openclaw.sh

# Show: Gateway logs with ArmorClaw enforcement
openclaw gateway logs
```

**Option B: Show Standalone Demo** (Easier to explain)
```bash
npm run demo:standalone
```

**Option C: Show Both** (Best of both worlds)
```bash
./run-demo.sh
# Select option 3
```

### For Video Recording:

1. Show architecture diagram from [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
2. Run `./run-demo.sh` → select option 2 (standalone for clearer output)
3. Walk through the console output showing:
   - ✅ ALLOWED actions executing
   - ❌ BLOCKED actions with reasons
   - Audit log entries
4. Show `cat logs/audit.jsonl | jq .` for traceability

---

## 🐛 Troubleshooting

### OpenClaw Gateway Won't Start
```bash
# Check Node version
node --version  # Must be 22+

# Fix Node version
source ~/.nvm/nvm.sh
nvm use 22

# Check port availability
lsof -Pi :8080 -sTCP:LISTEN

# Kill existing gateway
openclaw gateway stop
```

### ArmorClaw Plugin Not Loading
```bash
# Verify plugin is installed
ls -la ~/.openclaw/extensions/armorclaw/

# Check plugin status
openclaw plugins list | grep armorclaw

# Check config
cat ~/.openclaw/openclaw.json | jq .plugins
```

### API Key Issues
```bash
# Verify API key is set
echo $ARMORIQ_API_KEY

# Test API key manually
curl -X POST https://iap.armoriq.ai/health \
  -H "X-API-Key: $ARMORIQ_API_KEY"
```

### Permission Errors
```bash
# Check workspace permissions
ls -la workspace/project/

# Fix workspace ownership
chmod -R u+rw workspace/project/
```

---

## 📊 Viewing Results

### Audit Logs
```bash
# View all logs (formatted)
cat logs/audit.jsonl | jq .

# View specific types
cat logs/audit.jsonl | jq 'select(.type=="STEP_DECISION")'
cat logs/audit.jsonl | jq 'select(.decision=="BLOCKED")'

# Count allowed vs blocked
cat logs/audit.jsonl | jq 'select(.type=="STEP_DECISION")' | grep -c '"decision":"ALLOWED"'
cat logs/audit.jsonl | jq 'select(.type=="STEP_DECISION")' | grep -c '"decision":"BLOCKED"'
```

### Gateway Logs
```bash
# View OpenClaw gateway logs
openclaw gateway logs

# Follow logs in real-time
openclaw gateway logs -f

# Filter for ArmorClaw plugin messages
openclaw gateway logs | grep -i armorclaw
```

---

## 🎬 Recording Demo Video

### Recommended Setup:

1. **Terminal layout:**
   - Split terminal: Left = gateway output, Right = test commands
   - Or use tmux/screen for professional look

2. **Recording tools:**
   - **Linux:** SimpleScreenRecorder, OBS Studio
   - **Mac:** QuickTime, OBS Studio
   - **Web:** Loom, Screencastify

3. **Script (3 minutes):**
   ```
   0:00-0:30 → Architecture overview (show diagram)
   0:30-1:00 → Start gateway, explain ArmorClaw plugin
   1:00-1:45 → Run test showing ALLOWED action
   1:45-2:30 → Run tests showing BLOCKED actions
   2:30-3:00 → Show audit logs, wrap up
   ```

4. **Commands to run on camera:**
   ```bash
   # Show config
   openclaw plugins list | grep armorclaw
   
   # Start gateway
   ./start-openclaw.sh
   
   # Run tests (in 2nd terminal)
   ./test-openclaw.sh
   
   # Show audit logs
   cat logs/audit.jsonl | jq '.type, .decision, .reason' -c
   ```

---

## 📖 Additional Resources

- **OpenClaw Docs:** https://docs.openclaw.ai
- **ArmorIQ Platform:** https://platform.armoriq.ai
- **Plugin Source:** `~/.openclaw/extensions/armorclaw/`
- **Project Docs:** [docs/](../docs/)

---

## ✅ Integration Checklist

- [x] OpenClaw 2026.2.x installed
- [x] ArmorClaw plugin installed and loaded
- [x] ArmorIQ API key configured
- [x] Workspace directory exists
- [x] Policy files configured
- [x] Environment variables set
- [x] Scripts executable
- [ ] **Gateway tested and working**
- [ ] **Demo video recorded**
- [ ] **Architecture diagram created (visual)**

---

**Ready to test?** Run: `./run-demo.sh`
