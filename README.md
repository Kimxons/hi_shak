# VigilFit

VigilFit is a secure AI-assisted fitness tracking application built with Expo/React Native.

Project scope and milestones are defined from the proposal document in `docs/proposal-alignment.md`.

## Objectives

- Build secure user authentication with hashed passwords.
- Add two-factor authentication (2FA) for account protection.
- Implement workout tracking and food logging.
- Provide AI-assisted reminders and personalized recommendations.
- Validate usability, functionality, and security through testing.

## Development setup

1. Install dependencies.

   ```bash
   npm install
   ```

2. Create environment variables.

   ```bash
   copy .env.example .env
   ```

3. Start MongoDB (local service or Docker) and ensure `MONGODB_URI` is reachable.

4. Start the backend auth API.

   ```bash
   npm run api
   ```

5. Start the app in a second terminal.

   ```bash
   npx expo start
   ```

6. Run lint checks.

   ```bash
   npm run lint
   ```

7. Run backend integration tests.

   ```bash
   npm run test:api
   ```

8. Run mobile end-to-end UI tests (requires Maestro and an emulator/device).

   ```bash
   npm run test:e2e:mobile
   ```

## Auth API

- Base URL is read from `EXPO_PUBLIC_API_URL`.
- MongoDB connection is read from `MONGODB_URI`.
- TOTP issuer label is read from `TOTP_ISSUER`.
- Backend routes:
  - `GET /privacy/policy`
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/2fa/verify-login`
  - `GET /auth/me` (Bearer token required)
  - `POST /auth/2fa/setup` (Bearer token required)
  - `POST /auth/2fa/verify-enable` (Bearer token required)
  - `POST /auth/2fa/disable` (Bearer token required)
  - `GET /workouts` (Bearer token required)
  - `POST /workouts` (Bearer token required)
  - `PUT /workouts/:workoutId` (Bearer token required)
  - `DELETE /workouts/:workoutId` (Bearer token required)
  - `GET /nutrition/logs` (Bearer token required)
  - `POST /nutrition/logs` (Bearer token required)
  - `PUT /nutrition/logs/:logId` (Bearer token required)
  - `DELETE /nutrition/logs/:logId` (Bearer token required)
  - `GET /reminders/preferences` (Bearer token required)
  - `PUT /reminders/preferences` (Bearer token required)
  - `GET /reminders/today` (Bearer token required)
  - `GET /privacy/data-summary` (Bearer token required)
  - `DELETE /privacy/account` (Bearer token required)
  - `PUT /ai/preferences` (Bearer token required)
  - `GET /ai/recommendations` (Bearer token required, AI opt-in required)
- Passwords are hashed with `bcrypt`.
- Sessions use signed JWT tokens.
- Two-factor auth uses TOTP with one-time recovery codes.
- Account creation requires explicit privacy/data usage consent.

## MongoDB Atlas URI format

Use a URI with an explicit database name:

```env
MONGODB_URI=mongodb+srv://<username>:<url_encoded_password>@<cluster-host>/vigilfit?retryWrites=true&w=majority&appName=Cluster0
```

Notes:
- Replace `<url_encoded_password>` with your real password (URL-encode special characters).
- Do not leave placeholder values like `<db_password>`.

## Project docs

- Proposal alignment and phased plan: `docs/proposal-alignment.md`
- Existing fitness app constraint analysis: `docs/existing-fitness-app-analysis.md`
- Validation report: `docs/validation-report.md`
- Supervisor sign-off checklist: `docs/supervisor-signoff-checklist.md`
- Submission and deployment notes: `docs/submission-deployment-notes.md`
- Mobile E2E test guide: `e2e/maestro/README.md`
# hi_shak
