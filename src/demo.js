/**
 * ArmorClaw Scoped Developer Assistant
 * ArmorIQ x OpenClaw Hackathon
 * 
 * This demonstrates intent-aware autonomous agents with:
 * - Real ArmorIQ SDK integration for cryptographic intent tokens
 * - Policy-based enforcement with path scoping
 * - Bounded delegation between agents
 * 
 * Usage:
 *   # Run with policy enforcement
 *   node src/demo.js
 * 
 *   # Run with ArmorIQ cryptographic verification
 *   $env:ARMORIQ_API_KEY="your-api-key"; node src/demo.js
 * 
 * Scenarios demonstrated:
 * 1. ALLOWED: Button component refactoring (within scope)
 * 2. BLOCKED: Auth module modification (protected path)
 * 3. BLOCKED: .env file access (globally denied)
 * 4. BLOCKED: Review agent writing files (no write permission)
 * 5. BLOCKED: Delegation scope exceeded (narrow scope enforcement)
 */

import { AgentOrchestrator } from './core/agent-orchestrator.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

// ArmorIQ configuration (from environment)
const armoriqConfig = process.env.ARMORIQ_API_KEY ? {
  apiKey: process.env.ARMORIQ_API_KEY,
  userId: process.env.ARMORIQ_USER_ID || 'hackathon-user',
  agentId: process.env.ARMORIQ_AGENT_ID || 'scoped-dev-assistant',
  contextId: process.env.ARMORIQ_CONTEXT_ID || 'hackathon-demo',
  validitySeconds: 300,
} : null;

// Orchestrator configuration
const config = {
  workspaceRoot: path.join(projectRoot, 'workspace/project'),
  policyPath: path.join(projectRoot, 'config/policies.json'),
  logPath: path.join(projectRoot, 'logs'),
  verbose: true,
  armoriq: armoriqConfig,
};

async function runDemo() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║    🛡️  ARMORCLAW: SCOPED DEVELOPER ASSISTANT                          ║');
  console.log('║    Intent-Aware Autonomous Agent with Policy Enforcement            ║');
  console.log('║    ArmorIQ x OpenClaw Hackathon                                     ║');
  console.log('║                                                                      ║');
  if (armoriqConfig) {
    console.log('║    🔐 ArmorIQ: ENABLED (cryptographic intent verification)          ║');
  } else {
    console.log('║    🛡️  ArmorIQ: Set ARMORIQ_API_KEY for crypto verification          ║');
  }
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  
  // Ensure workspace exists
  const workspaceDir = config.workspaceRoot;
  if (!fs.existsSync(workspaceDir)) {
    console.error(`\n❌ Workspace directory not found: ${workspaceDir}`);
    console.log('   Run "node src/setup-workspace.js" to create demo files.');
    process.exit(1);
  }
  
  // Initialize orchestrator
  const orchestrator = new AgentOrchestrator(config);
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 1: ALLOWED - Button component refactoring
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n');
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│ SCENARIO 1: Refactoring Button Component (SHOULD BE ALLOWED)        │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');
    
    await orchestrator.executeIntent(
      'lead-agent',
      'Refactor the Button component to use React hooks',
      'Modernize Button.jsx with useState and useEffect hooks',
      [
        {
          stepId: 1,
          action: 'read',
          tool: 'file_read',
          target: 'src/components/Button.jsx',
          rationale: 'Read current implementation to understand structure'
        },
        {
          stepId: 2,
          action: 'write',
          tool: 'file_write',
          target: 'src/components/Button.jsx',
          rationale: 'Apply React hooks refactoring',
          content: `import React, { useState, useEffect } from 'react';

const Button = ({ children, onClick, variant = 'primary', disabled = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  useEffect(() => {
    console.log('Button mounted');
    return () => console.log('Button unmounted');
  }, []);
  
  const handleClick = (e) => {
    if (!disabled && onClick) {
      onClick(e);
    }
  };
  
  return (
    <button
      className={\\\`btn btn-\${variant} \${isHovered ? 'hovered' : ''} \${isPressed ? 'pressed' : ''}\\\`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
`
        }
      ]
    );
    
    await sleep(1000);
    
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 2: BLOCKED - Auth module modification
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n');
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│ SCENARIO 2: Auth Module Modification (SHOULD BE BLOCKED)            │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');
    
    await orchestrator.executeIntent(
      'lead-agent',
      'Update the authentication logic to add biometric support',
      'Add biometric authentication to auth.js',
      [
        {
          stepId: 1,
          action: 'read',
          tool: 'file_read',
          target: 'auth/auth.js',
          rationale: 'Read current auth implementation'
        },
        {
          stepId: 2,
          action: 'write',
          tool: 'file_write',
          target: 'auth/auth.js',
          rationale: 'Add biometric authentication',
          content: 'MODIFIED AUTH CODE'
        }
      ]
    );
    
    await sleep(1000);
    
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 3: BLOCKED - .env file access
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n');
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│ SCENARIO 3: Environment File Access (SHOULD BE BLOCKED)             │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');
    
    await orchestrator.executeIntent(
      'lead-agent',
      'Read the environment configuration',
      'Check .env for database settings',
      [
        {
          stepId: 1,
          action: 'read',
          tool: 'file_read',
          target: '.env',
          rationale: 'Read environment variables'
        }
      ]
    );
    
    await sleep(1000);
    
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 4: BLOCKED - Review agent trying to write
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n');
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│ SCENARIO 4: Review Agent Write Attempt (SHOULD BE BLOCKED)          │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');
    
    await orchestrator.executeIntent(
      'review-agent',
      'Fix the bug in Header component',
      'Apply fix directly to Header.jsx',
      [
        {
          stepId: 1,
          action: 'read',
          tool: 'file_read',
          target: 'src/components/Header.jsx',
          rationale: 'Review the Header component'
        },
        {
          stepId: 2,
          action: 'write',
          tool: 'file_write',
          target: 'src/components/Header.jsx',
          rationale: 'Apply the fix directly',
          content: 'FIXED CODE'
        }
      ]
    );
    
    await sleep(1000);
    
    // ═══════════════════════════════════════════════════════════════
    // SCENARIO 5: DELEGATION - Scope restrictions
    // ═══════════════════════════════════════════════════════════════
    console.log('\n\n');
    console.log('┌──────────────────────────────────────────────────────────────────────┐');
    console.log('│ SCENARIO 5: Delegation Flow (scope_exceeded = BLOCKED)              │');
    console.log('└──────────────────────────────────────────────────────────────────────┘');
    
    // Lead agent delegates to refactor-agent with NARROW scope
    await orchestrator.executeDelegatedIntent(
      'lead-agent',
      'refactor-agent',
      'Clean up the Header component styling',
      'Refactor Header.jsx styles only',
      [
        {
          stepId: 1,
          action: 'read',
          tool: 'file_read',
          target: 'src/components/Header.jsx',
          rationale: 'Read Header for style cleanup'
        },
        {
          stepId: 2,
          action: 'write',
          tool: 'file_write',
          target: 'src/components/Header.jsx',
          rationale: 'Apply style changes to Header',
          content: '// Cleaned up Header styles\nimport React from "react";\n\nconst Header = () => <header>Header</header>;\n\nexport default Header;'
        },
        {
          stepId: 3,
          action: 'write',
          tool: 'file_write',
          target: 'src/components/Footer.jsx',  // NOT in delegation scope!
          rationale: 'Also fix Footer while we are at it',
          content: 'FOOTER CHANGES'
        }
      ],
      {
        paths: ['src/components/Header.jsx'],  // Only Header allowed
        actions: ['read', 'write']
      }
    );
    
    // Print final summary
    console.log('\n\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                        DEMO COMPLETE                                 ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    console.log('║                                                                      ║');
    console.log('║  ✅ Scenario 1: Button refactor      → ALLOWED (within scope)       ║');
    console.log('║  ❌ Scenario 2: Auth modification    → BLOCKED (protected path)     ║');
    console.log('║  ❌ Scenario 3: .env access          → BLOCKED (globally denied)    ║');
    console.log('║  ❌ Scenario 4: Review agent write   → BLOCKED (no permission)      ║');
    console.log('║  ❌ Scenario 5: Delegation exceeded  → BLOCKED (scope restriction)  ║');
    console.log('║                                                                      ║');
    console.log('╠══════════════════════════════════════════════════════════════════════╣');
    if (armoriqConfig) {
      console.log('║  🔐 REAL ARMORIQ: Cryptographic intent tokens ACTIVE               ║');
    } else {
      console.log('║  ℹ️  Set ARMORIQ_API_KEY for real cryptographic verification       ║');
    }
    console.log('╚══════════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
  } finally {
    // Clean up ArmorIQ resources
    await orchestrator.close();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the demo
runDemo().catch(console.error);
