/**
 * ArmorClaw OpenClaw Agent
 * 
 * This is a real OpenClaw agent that runs through the OpenClaw gateway
 * with ArmorClaw plugin enforcement.
 * 
 * The agent demonstrates:
 * - Intent-aware execution through OpenClaw
 * - Policy enforcement via ArmorClaw plugin
 * - Multi-step reasoning with blocked/allowed actions
 * - Audit logging through ArmorIQ backend
 * 
 * Usage:
 *   1. Start gateway: ./start-openclaw.sh
 *   2. Send requests: ./test-openclaw.sh
 *   3. Or interact via: openclaw chat
 */

import { AgentOrchestrator } from './core/agent-orchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

/**
 * This function is called by OpenClaw gateway when a message is received
 * The ArmorClaw plugin intercepts tool calls and enforces policies
 */
export async function handleOpenClawMessage(message, context) {
  console.log('\n🦞 OpenClaw Agent received message:', message);
  console.log('🔐 ArmorClaw plugin will enforce policies before tool execution');
  
  // The agent uses OpenClaw's built-in tools
  // ArmorClaw plugin will:
  // 1. Capture the intent plan from LLM
  // 2. Get cryptographic token from ArmorIQ IAP
  // 3. Enforce policies before each tool call
  // 4. Block unauthorized actions
  
  return {
    response: message,
    status: 'processed'
  };
}

/**
 * Alternative: Use the custom orchestrator with OpenClaw workspace
 * This demonstrates the same policy enforcement logic but as a standalone agent
 */
export async function runCustomDemo() {
  const config = {
    workspaceRoot: path.join(projectRoot, 'workspace/project'),
    policyPath: path.join(projectRoot, 'config/policies.json'),
    logPath: path.join(projectRoot, 'logs/audit.jsonl'),
    verbose: true,
    armoriq: {
      apiKey: process.env.ARMORIQ_API_KEY || 'ak_live_f32e42f83d399e81285084b112faf6c688e1e7203182ba45ff7e0d331ab68458',
      userId: process.env.ARMORIQ_USER_ID || 'hackathon-user',
      agentId: process.env.ARMORIQ_AGENT_ID || 'scoped-dev-assistant',
      contextId: process.env.ARMORIQ_CONTEXT_ID || 'hackathon-demo',
      validitySeconds: 300,
    }
  };

  const orchestrator = new AgentOrchestrator(config);
  
  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('🛡️  ARMORCLAW CUSTOM ORCHESTRATOR (Standalone Mode)');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('This demonstrates the same enforcement logic as OpenClaw gateway');
  console.log('but runs as a standalone agent for testing purposes.');
  console.log('════════════════════════════════════════════════════════════════');
  
  // Run test scenarios
  await runTestScenarios(orchestrator);
  
  await orchestrator.close();
}

async function runTestScenarios(orchestrator) {
  // Scenario 1: ALLOWED
  console.log('\n\n📝 TEST 1: Read Component File (ALLOWED)');
  await orchestrator.executeIntent(
    'lead-agent',
    'Read the Button component',
    'Read Button.jsx to understand current implementation',
    [
      {
        action: 'read_file',
        target: 'src/components/Button.jsx',
        purpose: 'Read current Button implementation'
      }
    ]
  );
  
  await sleep(1000);
  
  // Scenario 2: BLOCKED - Protected path
  console.log('\n\n📝 TEST 2: Modify Auth File (BLOCKED)');
  await orchestrator.executeIntent(
    'lead-agent',
    'Update authentication logic',
    'Modify auth/login.js',
    [
      {
        action: 'write_file',
        target: 'auth/login.js',
        content: '// Updated auth',
        purpose: 'Update authentication logic'
      }
    ]
  );
  
  await sleep(1000);
  
  // Scenario 3: BLOCKED - Globally denied
  console.log('\n\n📝 TEST 3: Read .env File (BLOCKED)');
  await orchestrator.executeIntent(
    'lead-agent',
    'Check environment configuration',
    'Read .env file',
    [
      {
        action: 'read_file',
        target: '.env',
        purpose: 'Read environment variables'
      }
    ]
  );
  
  await sleep(1000);
  
  // Scenario 4: BLOCKED - Read-only role
  console.log('\n\n📝 TEST 4: Review Agent Write Attempt (BLOCKED)');
  await orchestrator.executeIntent(
    'review-agent',
    'Fix bug in Header',
    'Apply fix to Header.jsx',
    [
      {
        action: 'write_file',
        target: 'src/components/Header.jsx',
        content: '// Fixed',
        purpose: 'Apply bug fix'
      }
    ]
  );
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// If run directly, execute custom demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runCustomDemo().catch(console.error);
}
