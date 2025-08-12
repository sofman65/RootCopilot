# RootCopilot Template

A modern, full-stack template built with Next.js 15, Convex, and Clerk authentication. This template provides a solid foundation for building AI-powered applications with real-time data and user authentication.

## 🚀 Tech Stack

- **Frontend**: Next.js 15 with App Router
- **Backend**: Convex (real-time database & backend)
- **Authentication**: Clerk
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Package Manager**: npm

## 📁 Project Structure

```
rootcopilot.ai/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── convex/                # Convex backend
│   ├── _generated/        # Auto-generated types
│   ├── auth.config.ts     # Clerk auth configuration
│   └── messages.ts        # Example query
├── lib/                   # Utility functions
├── public/                # Static assets
└── package.json           # Dependencies
```

## 🛠️ Quick Start

1. **Clone this template**
   ```bash
   git clone <your-repo-url>
   cd rootcopilot.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CONVEX_URL=your_convex_deployment_url
   ```

4. **Set up Convex**
   ```bash
   npx convex dev
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Clerk Authentication
- Sign up at [clerk.com](https://clerk.com)
- Create a new application
- Copy your publishable and secret keys to `.env.local`

### Convex Backend
- Sign up at [convex.dev](https://convex.dev)
- Create a new project
- Run `npx convex dev` to start the development server
- Copy your deployment URL to `.env.local`

## 📝 Customization

### Adding New Convex Functions
1. Create new files in the `convex/` directory
2. Export queries, mutations, or actions
3. Run `npx convex dev` to regenerate types

### Styling
- Uses Tailwind CSS v4 for styling
- Global styles in `app/globals.css`
- Component-specific styles with Tailwind classes

### Authentication
- Clerk handles all authentication flows
- Protected routes with `<Authenticated>` component
- User data available via Clerk hooks

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Other Platforms
- Ensure environment variables are set
- Build command: `npm run build`
- Start command: `npm start`

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev)
- [Clerk Documentation](https://clerk.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This template is open source and available under the [MIT License](LICENSE).
