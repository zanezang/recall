# Recall

A focused spaced-repetition study queue built with Next.js. Recall uses a continuous-decay priority score to surface the concepts that are most useful to revisit next.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white) ![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748?logo=prisma)

## What it does

- Add concepts or questions with an initial confidence level from 1–5.
- Rank the five most important cards in a study queue.
- Review a card and update how confidently you recalled it.
- Recalculate card priority after queue actions, while keeping visible scores stable while you type.
- Provide responsive layouts, keyboard-friendly controls, and clear feedback for add, review, and delete actions.

Recall intentionally stays small: it is a single-purpose study tool without accounts, payments, or unrelated features.

## Priority model

Recall keeps the existing continuous-decay priority model:

```text
priority = elapsedTime / (confidence × ln(age + e))
```

Where `elapsedTime` is the time since a card was last reviewed and `age` is the time since it was created. A card's priority increases as more time passes; higher confidence reduces its priority. The queue is ordered with the highest priority first.

## Tech stack

- [Next.js](https://nextjs.org/) 16 and React 19
- TypeScript
- Prisma with SQLite and `better-sqlite3`
- Plain CSS for the responsive UI

The Prisma schema and local SQLite adapter are included in the project. The current study queue is client-side state, so refreshing the page clears cards; the database foundation remains available without changing the app's study workflow.

## Getting started

### Prerequisites

- Node.js 20.9 or newer
- npm

### Install and run

```bash
# Clone the repository and enter it
git clone https://github.com/<your-github-username>/recall.git
cd recall

# Install dependencies
npm install

# Create your local environment file
cp .env.example .env

# Generate the Prisma client
npm run db:generate

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

On Windows PowerShell, create the environment file with:

```powershell
Copy-Item .env.example .env
```

### Database commands

```bash
# Create and apply a development migration when the schema changes
npm run db:migrate

# Regenerate Prisma Client after a schema change
npm run db:generate
```

Local SQLite database files and `.env` are intentionally ignored by Git. Commit Prisma schema changes and migration files, not your local database.

## Quality checks

Run these before opening a pull request or pushing changes:

```bash
npm run lint
npm run typecheck
npm run build
```

## Project structure

```text
src/
  app/
    page.tsx        # Study queue UI and continuous-decay ranking
    globals.css     # Global and responsive interface styles
    layout.tsx      # App shell and metadata
  lib/
    prisma.ts       # SQLite Prisma client setup
prisma/
  schema.prisma     # Card data model
```
