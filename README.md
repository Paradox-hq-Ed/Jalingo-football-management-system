# Jalingo football: club site + league system

Monorepo for the two products demoed to the client:

| Path | What it is |
|---|---|
| `server/` | One API for both products. Node 22.5+, **zero npm dependencies** (built-in `node:http`, `node:sqlite`, `node:crypto`). |
| `apps/club-web/` | Eland FC club website and staff area (React + Vite). |
| `packages/shared/` | Shared API client, router, hooks, form handling, auth and UI components. |
| `apps/league-web/` | Jalingo Football League site, role portals and management system (React + Vite). |

## Run it

```bash
npm install
npm run seed          # creates server/data/jalingo.db from the demos' own data
npm run dev:server    # API on :4000
npm run dev:club      # club site on :5173   (proxies /api to :4000)
npm run dev:league    # league site on :5174
npm test              # 12 end-to-end API tests (see e2e/ for browser tests)
```

Production: `npm run build`, then `NODE_ENV=production JWT_SECRET=… npm start`. The API process serves the club site at `/` and the league at `/league/`.

Demo accounts (password `ChangeMe!123`, override with `DEMO_PASSWORD`; delete them before go-live):
`admin@eland.example` (club_admin) · `admin|team|coach|player|referee|media|sponsor@jfl.example`

Environment: `PORT`, `DB_FILE`, `JWT_SECRET` (required in production), `CORS_ORIGINS`, `TOKEN_TTL_SECONDS`, `DEMO_PASSWORD`, `SEED_ON_START`.

## Status

| Area | State |
|---|---|
| API: auth, roles, public data, portals, admin workflows, audit trail | Done, 12 end-to-end tests |
| `packages/shared`: API client, router, hooks, forms, auth, accessible UI kit | Done |
| `apps/club-web`: Home, Club, Teams (squads, staff, register), Matches, News, Partners, Contact, deep-linkable sheets, staff admin | Done, browser-tested |
| `apps/league-web`: public site, match centre, tables, stats, teams, players, officials, news, competition, contact | Done, browser-tested |
| `apps/league-web`: portals (team/coach team sheets, referee reports, player) and admin (fixtures, generator, results, officials, teams, players, discipline, content, settings, audit) | Done, browser-tested |
| Not yet built | Real photography/uploads, email notifications, password reset, file storage for documents, per-user account management |

Frontends use clean URLs (History API). The club app lives at `/`, the league at `/league/`; any static host needs a fallback to `index.html`. See `e2e/` for the browser tests.

## API at a glance

`/api/club/*` public reads (profile, matches, squads, players, former, people, news, gallery), `POST /api/club/enquiries`, and `/api/club/admin/*` (club_admin).
`/api/league/*` public reads (bootstrap, fixtures, tables, stats, teams, players, officials, news, documents, discipline), `POST /api/league/enquiries`, `/api/league/me` and portal actions (team sheet, referee report, appointment response, incident, case response), and `/api/league/admin/*` (admin): config, seasons, fixtures (+conflict check, generator, drafts), results (enter, correct, approve, dispute), appointments, applications, registrations, transfers, officials, discipline, announcements, news, documents, sponsors, audit.
Scheduling and duplicate-registration warnings return `409` with `details.canForce`; repeat with `?force=1` to override.

## Notes

- Storage is SQLite behind `server/src/db.js`. Swapping to Postgres only means re-implementing that file.
- Rate limiting is in-memory; use a shared store if you run more than one instance.
