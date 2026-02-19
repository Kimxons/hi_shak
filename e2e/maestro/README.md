# Mobile E2E (Maestro)

This suite validates the remaining proposal step: mobile end-to-end coverage for auth, logging, and AI flows.

## Prerequisites

- MongoDB is running and `MONGODB_URI` is configured.
- Backend API is running (`npm run api`).
- Mobile app is installed on emulator/device with app id `com.kimxons.VigilFit`.
- [Maestro CLI](https://maestro.mobile.dev/) is installed and available as `maestro`.

## Test account setup

Reset and seed a deterministic E2E account:

```bash
npm run e2e:mobile:seed
```

Default credentials used by flows:

- Email: `e2e.mobile@vigilfit.test`
- Password: `Password1234`

## Run tests

Run full suite:

```bash
npm run test:e2e:mobile
```

Run individual flows:

```bash
npm run test:e2e:mobile:auth
npm run test:e2e:mobile:logging
npm run test:e2e:mobile:ai
```

## Included flows

- `auth-flow.yaml`: sign-in and sign-out.
- `logging-flow.yaml`: create workout and nutrition entries, verify they appear.
- `ai-flow.yaml`: enable AI insights and verify dashboard recommendations/disclaimer visibility.
