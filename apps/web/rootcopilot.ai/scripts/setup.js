#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('RootCopilot Setup\n');

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setup() {
  try {
    // Get project information
    const projectName = await question('Enter your project name: ');
    const authorName = await question('Enter your name: ');
    
    // Update package.json
    const packagePath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    packageJson.name = projectName.toLowerCase().replace(/\s+/g, '-');
    packageJson.author = authorName;
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    
    // Create .env.local template
    const envTemplate = `# FastAPI backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
`;
    
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envTemplate);
      console.log('Created .env.local template');
    } else {
      console.log('.env.local already exists, skipping...');
    }
    
    console.log('\nSetup complete!');
    console.log('\nNext steps:');
    console.log('1. Edit .env.local with your FastAPI base URL');
    console.log('2. Run: npm install');
    console.log('3. Start your FastAPI backend');
    console.log('4. Run: npm run dev');
    console.log('\nCheck README.md for detailed instructions');
    
  } catch (error) {
    console.error('Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup();
