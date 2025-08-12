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

console.log('🚀 RootCopilot Template Setup\n');

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
    const envTemplate = `# Clerk Authentication
# Get these from https://clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Convex Backend
# Get this from https://convex.dev after running 'npx convex dev'
NEXT_PUBLIC_CONVEX_URL=https://your-project-name.convex.cloud

# Optional: Clerk Frontend API URL (usually auto-detected)
# CLERK_FRONTEND_API_URL=https://clerk.your-domain.com
`;
    
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envTemplate);
      console.log('✅ Created .env.local template');
    } else {
      console.log('⚠️  .env.local already exists, skipping...');
    }
    
    console.log('\n🎉 Setup complete!');
    console.log('\nNext steps:');
    console.log('1. Edit .env.local with your actual API keys');
    console.log('2. Run: npm install');
    console.log('3. Run: npx convex dev (in one terminal)');
    console.log('4. Run: npm run dev (in another terminal)');
    console.log('\n📚 Check README.md for detailed instructions');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup();
