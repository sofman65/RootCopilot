# RootCopilot Web

Next.js frontend for RootCopilot, backed by a FastAPI service.

## Features

- Next.js App Router with Turbopack
- TypeScript
- Tailwind CSS v4
- FastAPI-backed workspace, issue, thread, search, and RAG calls
- Theme support

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A running RootCopilot FastAPI backend

### Install

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

## API Wiring

Frontend API calls are centralized in `lib/rootcopilot-api.ts`. If the FastAPI route names differ, update that file rather than editing individual components.

Expected route groups:

- `GET /clients`
- `GET /clients/{clientId}/projects`
- `GET /projects/{projectId}/environments`
- `GET /environments/{environmentId}/issues`
- `GET /search?term=...`
- `GET /rag/entries`
- `POST /rag/documents`
- `POST /rag/ask`
- `GET /issues/{issueId}`
- `GET|POST /issues/{issueId}/thread`
- `GET|POST /threads/{threadId}/messages`
- `POST /threads/{threadId}/assistant/reply`
- `POST /threads/{threadId}/assistant/quick-action`

## Project Structure

```text
rootcopilot.ai/
├── app/                    # Next.js App Router pages
├── components/             # UI and app components
├── lib/                    # Utilities and FastAPI client
├── public/                 # Static assets
└── package.json
```
