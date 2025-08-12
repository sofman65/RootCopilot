# RootCopilot Template

A modern, full-stack template for building AI-powered applications with real-time data and user authentication.

## 🚀 Features

- ⚡ **Next.js 15** with App Router and Turbopack
- 🔥 **Convex** for real-time database and backend
- 🔐 **Clerk** for authentication and user management
- 🎨 **Tailwind CSS v4** for styling
- 📱 **TypeScript** for type safety
- 🔄 **Real-time updates** out of the box

## 🛠️ Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Convex account
- Clerk account

### Installation

1. **Clone and install**
   ```bash
   git clone <your-repo-url>
   cd rootcopilot.ai
   npm install
   ```

2. **Environment Setup**
   Create `.env.local`:
   ```env
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   
   # Convex Backend
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

3. **Start Development**
   ```bash
   # Terminal 1: Start Convex dev server
   npx convex dev
   
   # Terminal 2: Start Next.js dev server
   npm run dev
   ```

## 📁 Project Structure

```
rootcopilot.ai/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global Tailwind styles
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page with auth
├── convex/                # Convex backend functions
│   ├── _generated/        # Auto-generated types
│   ├── auth.config.ts     # Clerk auth configuration
│   └── messages.ts        # Example query function
├── lib/                   # Utility functions
│   └── utils.ts           # Common utilities
├── public/                # Static assets
└── package.json           # Dependencies
```

## 🔧 Configuration

### Clerk Setup
1. Go to [clerk.com](https://clerk.com) and create an account
2. Create a new application
3. Copy your publishable and secret keys
4. Add them to `.env.local`

### Convex Setup
1. Go to [convex.dev](https://convex.dev) and create an account
2. Create a new project
3. Run `npx convex dev` to start development
4. Copy your deployment URL to `.env.local`

## 📝 Usage Examples

### Adding a New Convex Query

```typescript
// convex/users.ts
import { query } from './_generated/server'

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    
    return await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), identity.email))
      .first()
  },
})
```

### Using Convex in Components

```typescript
// app/components/UserProfile.tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function UserProfile() {
  const user = useQuery(api.users.getCurrentUser)
  
  if (!user) return <div>Loading...</div>
  
  return <div>Welcome, {user.name}!</div>
}
```

### Protected Routes

```typescript
// app/dashboard/page.tsx
'use client'

import { Authenticated } from 'convex/react'

export default function Dashboard() {
  return (
    <Authenticated>
      <div>Protected dashboard content</div>
    </Authenticated>
  )
}
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Environment Variables for Production

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

## 🔄 Development Workflow

1. **Start development servers**
   ```bash
   npx convex dev  # Terminal 1
   npm run dev     # Terminal 2
   ```

2. **Make changes**
   - Edit Convex functions in `convex/`
   - Update React components in `app/`
   - Types are auto-generated

3. **Test changes**
   - Convex functions hot-reload
   - Next.js components hot-reload
   - Check browser console for errors

## 📚 Additional Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)

## 🤝 Support

- Check the [main README](../README.md) for more details
- Open an issue for bugs or feature requests
- Join our community discussions

---

Built with ❤️ using Next.js, Convex, and Clerk
