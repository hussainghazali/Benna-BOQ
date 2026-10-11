# Benna — Build My Project (standalone BOQ builder)

Standalone duplicate of Benna's **"Generate BOQ"** feature: a 3-step wizard that
produces a full Bill of Quantities matched to real catalog products, with
per-line totals, Add-to-cart, Add-All, and CSV export. Sign-in included.

## Stack

- **Frontend** — Vite + React 18 + TS, Tailwind + shadcn/ui, deterministic BOQ
  rule engine (`src/lib/boq-engine`) + client-side catalog matcher
- **Backend** — Express + MongoDB (Mongoose) + JWT auth + credits ledger
  (50 free BOQs granted once server-side, 1 credit per generation, atomic
  deduction inside `POST /boq-projects`)

## Run locally

```bash
# backend (port 1943)
cd backend && npm install && cp .env.example .env   # set JWT_SECRET, DB_URL
npm run seed:products                               # 47-product demo catalog
npm run dev

# frontend (port 5173)
cd .. && npm install && npm run dev
```

Then open http://localhost:5173 — register or sign in → wizard → Generate BOQ.

## Routes

- `/build-project` — 3-step wizard + result table (main feature)
- `/boq-projects`, `/boq-projects/:id` — saved projects
- `/credits` — credit balance / transactions
- `/login`, `/register`

## API surface (`/api/users/website/*`)

- `POST /boq-projects` (atomic credit-deduct + create), `GET/PUT/DELETE`
- `GET /:customerId/credits`, `/credit-transactions`, `POST …/credits/deduct`
- `POST /credits/purchase` + `…/paytabs/callback` (PayTabs — optional; warns if unconfigured)
- `POST /boq-feedback`, `POST /boq-gaps/log`, `POST /boq-activity`
- `GET /search` (keyword product search for the matcher), `GET /products/:slug`

## Credits rules

- New customer → `UserCredits { balance: 50 }` granted exactly once
- Each `POST /boq-projects`: balance>0 (or active business subscription) else
  **402 INSUFFICIENT_CREDITS**; deducts 1 + writes a `CreditTransaction` usage row
- Paid packs (boq_100/250/500/1000) go through PayTabs — needs
  `PAYTABS_PROFILE_ID`, `PAYTABS_SERVER_KEY`, `CREDITS_CALLBACK_URL`

## Env

Backend: `PORT`, `DB_URL`, `JWT_SECRET`, optional PayTabs vars (`.env.example`)
Frontend: `VITE_API_URL` (e.g. `http://localhost:1943/api`), `VITE_API_KEY` (empty)

## Trims vs the original

No AI pipeline (`services/boq/*` omitted), no Redis/Bull, no real mailers
(no-op stubs), no Sentry/Clarity/Algolia, vendor chat stubbed.
