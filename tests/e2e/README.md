# End-to-end tests

These tests drive a **production build** of the app in Chromium against **real Express API instances** that use a **disposable PostgreSQL
database** (never a development or shared database). No payment provider and no e-mail service are configured or contacted.

## One-time setup

```bash
npm install
npx playwright install chromium      # downloads the browser
```

## Start the two test APIs (backend repository)

Create a disposable database (for example `ioh_e2e`), run the backend's `npm run migrate` and `npm run seed` against it, then start two API
instances with these settings (everything else as in the backend's `.env.example`; **no** `PAYMENTS_PROVIDER`, **empty** `CORS_ORIGINS`):

| Instance | `PORT` | `TRUST_PROXY` | `RATE_LIMIT_AUTH_MAX` | used by |
|---|---|---|---|---|
| main | `4100` | `0` | `100000` | all specs on app port 3100 (`TRUSTED_PROXY_HOPS=0`) |
| rate-limit | `4101` | `1` | `3` | `csrf-and-rate-limit.spec.ts` on app port 3101 (`TRUSTED_PROXY_HOPS=1`) |

Create the accounts the tests sign in with (all with password `Passw0rdtest`): a brand `acme.brand@ioh.test`; an **active** creator
`kevin.creator@ioh.test`; a **pending** creator `pending.creator@ioh.test`; administrators `manager@ioh.test` (Campaign Manager),
`finance@ioh.test` (Finance), `super.admin@ioh.test` (Super Admin). The backend has no public admin sign-up, so the administrators are
inserted with the application's Argon2 hash; the rest can be created through the API (register, wizard, approval by the manager).

Override the API addresses with `E2E_API_URL` and `E2E_API_RATELIMIT_URL` if they differ from `http://127.0.0.1:4100/api/v1` and `http://127.0.0.1:4101/api/v1`.

## Run

```bash
npm run test:e2e        # builds the app, starts it on ports 3100 and 3101 and runs the specs
```
