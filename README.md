# Recall

**Recall** is a focused spaced-repetition study queue that helps learners revisit concepts at the right time. It uses a continuous-decay priority model to rank the concepts that are most useful to study next.

Built as a deliberately minimal learning tool: no accounts, distractions, or feature bloat—just a clear queue for active recall.

## Highlights

- **Continuous-decay ranking** — cards rise in priority as time passes, while stronger confidence lowers their urgency.
- **Focused review flow** — update recall confidence from 1–5 after each review to refresh a card's place in the queue.
- **Clear, responsive interface** — scan-friendly card hierarchy, visual confidence indicators, mobile layouts, and keyboard-friendly modal controls.
- **Thoughtful interaction feedback** — immediate confirmation after cards are added, reviewed, or deleted.
- **Stable score display** — visible priority scores remain fixed while entering a new card and refresh only after a study-queue action.

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
- Responsive CSS with no component-library dependency

## Running locally

```bash
npm install
cp .env.example .env
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
