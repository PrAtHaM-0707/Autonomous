/**
 * ArmorClaw Workspace Initializer
 * Creates the real files needed for the filesystem demo execution
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.dirname(__dirname);

const workspacePath = path.join(projectRoot, 'workspace', 'project');

const filesToCreate = [
  {
    path: path.join(projectRoot, '.env'),
    content: 'ARMORIQ_API_KEY=ak_live_demo_12345\nDB_PASSWORD=super_secret_admin_pass\nAWS_SECRET=aws_secret_key_9876'
  },
  {
    path: path.join(workspacePath, 'auth', 'login.js'),
    content: 'export const login = (user, pass) => { return true; }; // Critical auth logic'
  },
  {
    path: path.join(workspacePath, 'src', 'components', 'Button.jsx'),
    content: 'import React from "react";\n\nconst Button = () => <button>Click Me</button>;\nexport default Button;'
  },
  {
    path: path.join(workspacePath, 'src', 'components', 'Header.jsx'),
    content: 'import React from "react";\n\nconst Header = () => <header>Logo</header>;\nexport default Header;'
  },
  {
    path: path.join(workspacePath, 'config', 'database.yml'),
    content: 'production:\n  host: 10.0.0.1\n  user: root'
  }
];

console.log('🧹 Initializing clean workspace for ArmorClaw demo...');

filesToCreate.forEach(file => {
  const dir = path.dirname(file.path);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(file.path, file.content, 'utf-8');
  console.log(`✅ Created: ${file.path.replace(projectRoot, '')}`);
});

console.log('\n🎉 Workspace ready! You can now run the interactive demo.');