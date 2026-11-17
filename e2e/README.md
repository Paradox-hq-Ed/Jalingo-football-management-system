# Browser smoke tests

Playwright scripts that drive the built apps against a running API. They load every route, fail on console/network errors, exercise the enquiry form, admin sign-in, result approval, scheduling validation, team sheets and referee portal, and check for horizontal overflow at phone width.

```bash
npm run build && npm run seed && npm start        # API + built apps on :4000
npm i -D playwright && npx playwright install chromium
node e2e/club-smoke.cjs <a-player-id>              # e.g. first-1
node e2e/league-smoke.cjs
node e2e/mobile-overflow.cjs
```
Expected 400s in the output are intentional (empty-form validation).
