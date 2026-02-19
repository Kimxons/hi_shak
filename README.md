# VigilFit

VigilFit is a secure AI-assisted fitness tracking app built with Expo/React Native (mobile client) and Node.js/Express + MongoDB (backend API).

## Implementation status

- Secure auth: register/login, bcrypt password hashing, JWT sessions.
- Two-factor auth (TOTP): setup, login challenge, recovery codes, disable flow.
- Fitness logging: workout and nutrition CRUD APIs with mobile create/list/delete flows.
- AI + reminders: explicit opt-in, generated recommendations, reminder preferences, daily prompts.
- Privacy controls: consent at signup, privacy policy endpoint, user data summary, account deletion.
- Automated validation: backend integration tests + Maestro mobile E2E flows.

Use the final-round checklist at `docs/final-implementation-checklist.md`.

## Architecture

- Mobile app: Expo Router, React Native, SecureStore token persistence.
- API server: Express 5 in `backend/server.js`.
- Database: MongoDB via Mongoose models in `backend/models`.
- Test stack:
  - API integration tests: `backend/tests/api.integration.test.js`
  - Mobile E2E tests: `e2e/maestro/*.yaml`

## Quick start

1. Install dependencies.
   ```bash
   npm install
   ```
2. Create local environment config.
   ```bash
   copy .env.example .env
   ```
3. Update `.env` values (especially `JWT_SECRET`, `MONGODB_URI`, `EXPO_PUBLIC_API_URL`).
4. Start backend API.
   ```bash
   npm run api
   ```
   If Atlas/local Mongo is unavailable, use in-memory mode:
   ```bash
   npm run api:memory
   ```
5. Start app in another terminal.
   ```bash
   npx expo start
   ```

Detailed configuration guide: `docs/configuration-guide.md`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_API_PORT` | Yes | Backend API port (`4000` default). |
| `JWT_SECRET` | Yes | JWT signing key; set a long random value. |
| `MONGODB_URI` | Yes | MongoDB connection URI with explicit database name. |
| `TOTP_ISSUER` | Yes | Label shown in authenticator apps during 2FA setup. |
| `EXPO_PUBLIC_API_URL` | Yes | Mobile app API base URL. |
| `E2E_MOBILE_EMAIL` | Optional | Seeded mobile E2E account email. |
| `E2E_MOBILE_PASSWORD` | Optional | Seeded mobile E2E account password. |

Example Atlas URI:

```env
MONGODB_URI=mongodb+srv://<username>:<url_encoded_password>@<cluster-host>/vigilfit?retryWrites=true&w=majority&appName=Cluster0
```

## Validation commands

- Lint:
  ```bash
  npm run lint
  ```
- Type check:
  ```bash
  npx tsc --noEmit
  ```
- Backend integration tests:
  ```bash
  npm run test:api
  ```
- Full submission validation (lint + typecheck + API tests):
  ```bash
  npm run validate:submission
  ```
- Mobile E2E suite (requires Maestro + emulator/device):
  ```bash
  npm run test:e2e:mobile
  ```

## API surface

- Auth: `/auth/register`, `/auth/login`, `/auth/me`, `/auth/2fa/*`
- Fitness logs: `/workouts`, `/nutrition/logs`
- AI: `/ai/preferences`, `/ai/recommendations`
- Reminders: `/reminders/preferences`, `/reminders/today`
- Privacy: `/privacy/policy`, `/privacy/data-summary`, `/privacy/account`

See `backend/server.js` for full request/response behavior.

## Project documentation

- Proposal alignment: `docs/proposal-alignment.md`
- Existing app analysis: `docs/existing-fitness-app-analysis.md`
- Configuration guide: `docs/configuration-guide.md`
- Final implementation checklist: `docs/final-implementation-checklist.md`
- Validation report: `docs/validation-report.md`
- Supervisor sign-off checklist: `docs/supervisor-signoff-checklist.md`
- Usability evaluation template: `docs/usability-evaluation-template.md`
- Submission/deployment notes: `docs/submission-deployment-notes.md`
- Mobile E2E guide: `e2e/maestro/README.md`
