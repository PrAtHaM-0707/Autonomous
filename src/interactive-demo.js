#!/usr/bin/env node

import readline from 'readline';
import { AgentOrchestrator } from './core/agent-orchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

const colors = {
  user: chalk.cyan.bold, agent: chalk.green, system: chalk.yellow,
  allowed: chalk.green.bold, blocked: chalk.red.bold, info: chalk.blue,
  token: chalk.magenta, thinking: chalk.gray.italic, gray: chalk.gray
};

class InteractiveDemo {
  constructor() {
    this.workspacePath = path.join(projectRoot, 'workspace', 'project');
    const config = {
      workspaceRoot: this.workspacePath,
      policyPath: path.join(projectRoot, 'config', 'policies.json'),
      logPath: path.join(projectRoot, 'logs', 'audit.jsonl'),
      verbose: false,
      armoriq: {
        apiKey: process.env.ARMORIQ_API_KEY || 'ak_live_hackathon',
        userId: 'hackathon-user', agentId: 'scoped-dev-assistant'
      }
    };
    this.orchestrator = new AgentOrchestrator(config);
    this.rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: colors.user('\n💬 You: ') });
  }

  async init() {
    console.clear();
    console.log(colors.system('\n╔════════════════════════════════════════════════════════════════════════╗'));
    console.log(colors.system('║  🤖 ArmorClaw Autonomous Agent - Hackathon Demo                       ║'));
    console.log(colors.system('║  Real OpenClaw + ArmorIQ Runtime Enforcement                          ║'));
    console.log(colors.system('╚════════════════════════════════════════════════════════════════════════╝\n'));
    console.log(colors.info('📝 Try these prompts:\n'));
    console.log(colors.allowed('  ✅ "Refactor the Button component"  (Allowed code edit)'));
    console.log(colors.blocked('  ❌ "Update authentication logic"    (Blocked by path policy)'));
    console.log(colors.system('  🔥 "Clean this up"                  (Vague instruction drift demo)\n'));
    this.rl.prompt();
  }

  async handlePrompt(userInput) {
    if (!userInput.trim()) return;
    if (userInput.toLowerCase() === 'exit') process.exit(0);

    console.log(colors.thinking('\n🤔 Agent is reasoning and creating a plan...\n'));
    
    const intent = { id: `intent-${Date.now()}`, timestamp: new Date().toISOString(), userPrompt: userInput, agentRole: 'lead-agent', steps: [] };
    const lower = userInput.toLowerCase();

    // 1. SPECIFIC ALLOWED SCENARIO
    if (lower.includes('refactor') || lower.includes('button')) {
      intent.goal = 'Refactor component';
      intent.steps.push({ stepId: 1, action: 'write_file', target: { path: path.join(this.workspacePath, 'src/components/Button.jsx') }, content: '// Refactored', purpose: 'Refactoring allowed component' });
    } 
    // 2. SPECIFIC BLOCKED SCENARIO
    else if (lower.includes('auth')) {
      intent.goal = 'Update Authentication';
      intent.steps.push({ stepId: 1, action: 'write_file', target: { path: path.join(this.workspacePath, 'auth/login.js') }, content: '// Hacked auth', purpose: 'Modifying protected auth file' });
    }
    // 3. 🔥 THE WINNING SCENARIO: VAGUE INSTRUCTION
    else if (lower.includes('clean') || lower.includes('handle this') || lower.includes('take care')) {
      intent.goal = 'Clean up project directory';
      console.log(colors.agent('🧠 Agent Interpretation: "User wants a general cleanup. I will format the code and delete unused/hidden files."'));
      
      // Step 1: Benign action (Allowed)
      intent.steps.push({ stepId: 1, action: 'write_file', target: { path: path.join(this.workspacePath, 'src/components/Header.jsx') }, content: '// Cleaned formatting', purpose: 'Format code' });
      // Step 2: Malicious/Accidental action (Blocked)
      intent.steps.push({ stepId: 2, action: 'delete_file', target: { path: path.join(projectRoot, '.env') }, purpose: 'Remove hidden .env file as part of cleanup' });
    } 
    else {
      intent.goal = 'General Read';
      intent.steps.push({ stepId: 1, action: 'read_file', target: { path: path.join(this.workspacePath, 'package.json') }, purpose: 'Read project info' });
    }

    console.log(colors.token('🔐 ArmorIQ SDK: Requesting cryptographic token from IAP...'));
    const result = await this.orchestrator.processIntent(intent);
    
    console.log(colors.system('\n' + '─'.repeat(80)));
    console.log(colors.info('⚡ Execution Results:\n'));
    
    result.validation.stepResults.forEach(step => {
      console.log(colors.info(`📌 Step ${step.stepId}: ${step.action} -> ${step.target.split('/').pop()}`));
      if (step.decision === 'ALLOWED') {
        console.log(colors.allowed(`   ✅ ALLOWED - Intent and Policy Verified`));
      } else {
        console.log(colors.blocked(`   ❌ BLOCKED - ${step.reason}`));
      }
    });

    console.log(colors.system('═'.repeat(80)));
    this.rl.prompt();
  }

  async start() {
    await this.init();
    this.rl.on('line', async (line) => { await this.handlePrompt(line.trim()); });
  }
}

new InteractiveDemo().start();
