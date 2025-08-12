# Template Usage Guide

This is a template repository for creating new projects with Next.js, Convex, and Clerk. Here's how to use it:

## 🚀 Quick Start

### Option 1: Use as Template (Recommended)
1. Click "Use this template" on GitHub
2. Create a new repository
3. Clone your new repository
4. Follow the setup instructions in README.md

### Option 2: Manual Setup
1. Clone this repository
2. Remove the `.git` folder: `rm -rf .git`
3. Initialize a new git repository: `git init`
4. Update package.json with your project name
5. Follow the setup instructions in README.md

## 🔧 Customization Steps

### 1. Update Project Information
- Edit `package.json`:
  - Change `name` to your project name
  - Update `description`
  - Change `author` to your name

### 2. Set Up Environment Variables
Create `.env.local` with your actual values:
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_actual_key
CLERK_SECRET_KEY=your_actual_secret
NEXT_PUBLIC_CONVEX_URL=your_actual_convex_url
```

### 3. Configure Services
- **Clerk**: Create a new application at [clerk.com](https://clerk.com)
- **Convex**: Create a new project at [convex.dev](https://convex.dev)

### 4. Customize Content
- Update `app/page.tsx` with your app's content
- Modify `convex/messages.ts` or create new Convex functions
- Update styling in `app/globals.css`

### 5. Update Documentation
- Edit `README.md` with your project-specific information
- Remove or update this `TEMPLATE.md` file

## 📁 What to Keep/Remove

### Keep These Files
- `convex/` - Your backend functions
- `app/` - Your Next.js app
- `lib/` - Utility functions
- `public/` - Static assets
- Configuration files (`.eslintrc`, `tailwind.config.js`, etc.)

### Consider Removing
- `TEMPLATE.md` - This file
- Example Convex functions in `convex/messages.ts`
- Template-specific documentation

### Update These
- `package.json` - Project name and description
- `README.md` - Project-specific documentation
- Environment variables
- App content and styling

## 🎯 Next Steps

1. **Start Development**
   ```bash
   npm install
   npx convex dev  # Terminal 1
   npm run dev     # Terminal 2
   ```

2. **Add Your Features**
   - Create new Convex functions
   - Build React components
   - Add authentication flows
   - Style your application

3. **Deploy**
   - Connect to Vercel for frontend
   - Deploy Convex functions
   - Set up production environment variables

## 💡 Tips

- Use the existing authentication setup as a foundation
- Leverage Convex's real-time capabilities
- Follow the established project structure
- Keep the TypeScript configuration
- Use Tailwind CSS for consistent styling

---

Happy coding! 🚀
