# Power-house

Power-house is a React and Supabase trading journal for recording and reviewing personal trading activity. It provides a dark, terminal-inspired workspace for accounts, trades, calendar entries, rules, and performance reviews.

## Features

- Dashboard with trading summaries and charts
- Account, trade, calendar, and review workflows
- Image uploads for trade records
- Supabase-backed data and authentication integration
- Responsive React UI with reusable components

## Built with

React 19, TypeScript, Vite, Recharts, React Router, and Supabase.

## Run locally

Requirements: Node.js 18 or later and a Supabase project.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_REGISTRATION_SECRET_CODE` in `.env.local`. The public repository contains placeholders only; never commit service keys, passwords, or production credentials.

Build and preview with `npm run build` and `npm run preview`.

## Project structure

- `src/pages/` – dashboard, trades, accounts, reviews, settings, login, and registration
- `src/components/` – reusable UI and upload components
- `src/services/` – Supabase and local storage integration
- `src/types/` – shared TypeScript types

## License

Released under the MIT License. See [LICENSE](LICENSE).
