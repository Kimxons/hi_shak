# App Configuration Guide

This guide shows how to configure VigilFit for local development, emulator use, physical device testing, and final validation.

## 1. Prerequisites

- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Expo CLI (`npx expo ...`)
- Maestro CLI (only for mobile E2E)

## 2. Create `.env`

From the project root:

```bash
copy .env.example .env
```

Then set values:

```env
AUTH_API_PORT=4000
JWT_SECRET=replace-with-a-long-random-secret
MONGODB_URI=mongodb://127.0.0.1:27017/vigilfit
TOTP_ISSUER=VigilFit
EXPO_PUBLIC_API_URL=http://localhost:4000
E2E_MOBILE_EMAIL=e2e.mobile@vigilfit.test
E2E_MOBILE_PASSWORD=Password1234
```

## 3. Configure `MONGODB_URI`

Rules enforced by `backend/db.js`:

- Must start with `mongodb://` or `mongodb+srv://`
- Must include a database name (for example `/vigilfit`)
- Must not contain placeholder text such as `<db_password>`

Atlas example:

```env
MONGODB_URI=mongodb+srv://<username>:<url_encoded_password>@<cluster-host>/vigilfit?retryWrites=true&w=majority&appName=Cluster0
```

If Atlas connection fails, check:

- IP allow list (Network Access)
- username/password correctness
- URL-encoding of password special characters

## 4. Configure `EXPO_PUBLIC_API_URL` by target

Use a value reachable from the running app instance:

- iOS simulator: `http://localhost:4000`
- Android emulator: `http://10.0.2.2:4000`
- Physical device on same Wi-Fi: `http://<your-lan-ip>:4000`

Example for physical device:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.25:4000
```

## 5. Start order

Terminal 1 (API):

```bash
npm run api
```

If MongoDB networking blocks Atlas/local DB, run the API with an in-memory MongoDB instance:

```bash
npm run api:memory
```

Terminal 2 (mobile app):

```bash
npx expo start
```

Health check:

```bash
curl http://localhost:4000/health
```

Expected response:

```json
{"ok":true}
```

## 6. Configure E2E credentials (optional but recommended)

If you change `E2E_MOBILE_EMAIL` or `E2E_MOBILE_PASSWORD`, reseed before running Maestro:

```bash
npm run e2e:mobile:seed
```

## 7. Validation commands

Baseline:

```bash
npm run validate:submission
```

Full suite:

```bash
npm run validate:submission:full
```

## 8. Common issues

- `Session is invalid or expired`:
  - Verify backend is running and `JWT_SECRET` is stable.
- Mobile cannot reach API:
  - Fix `EXPO_PUBLIC_API_URL` for your device target.
- API fails at startup:
  - Verify `MONGODB_URI` format and database reachability.
- 2FA code rejected:
  - Confirm authenticator app time is correct and use the latest code window.
