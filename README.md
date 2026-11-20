# Recall

**Recall** is a focused spaced-repetition study tool that helps learners revisit concepts at the right time. It uses a continuous-decay priority model to rank the concepts that are most useful to study next.

Built as a deliberately minimal learning tool: no accounts, distractions, or feature bloat—just a clear list of what to study next.

## Highlights

- **Continuous-decay ranking** — cards rise in priority as time passes, while stronger confidence lowers their urgency.
- **Persistent storage** — cards are saved to SQLite through Next.js API routes, so they survive page refreshes and server restarts.
- **Focused review flow** — update recall confidence from 1–5 after each review to refresh its place in the study list.
- **Clear, responsive interface** — scan-friendly card hierarchy, visual confidence indicators, mobile layouts, and keyboard-friendly modal controls.
- **Thoughtful interaction feedback** — immediate confirmation after cards are added, reviewed, or deleted.
- **Stable score display** — visible priority scores remain fixed while entering a new card and refresh only after a study action.

## Priority model

Recall ranks cards using the following formula:

```text
priority = elapsedTime / (confidence × ln(age + e))
```

- `elapsedTime`: time since the card was last reviewed
- `confidence`: the learner’s self-assessed recall confidence (1–5)
- `age`: time since the card was created

This makes overdue, low-confidence concepts surface sooner while allowing well-known concepts to recede naturally.

## Tech stack

- **Next.js 16** and **React 19**
- **TypeScript**
- **Prisma** with **SQLite** and `better-sqlite3`
- **REST API** via Next.js route handlers:

  | Method | Route | Action |
  | --- | --- | --- |
  | `GET` | `/api/cards` | List all cards |
  | `POST` | `/api/cards` | Create a card |
  | `PATCH` | `/api/cards/:id` | Save a review (confidence + review time) |
  | `DELETE` | `/api/cards/:id` | Delete a card |

- Responsive CSS with no component-library dependency

## Running locally

```bash
npm install
cp .env.example .env
npm run db:migrate   # creates prisma/dev.db and its tables
npm run db:generate
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Quality

```bash
npm run lint
npm run typecheck
npm run build
```
