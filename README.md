# Barcelona Elections 2026

Live overlay toolkit for Barcelona elections coverage, built with React and Vite.

## Run locally

Prerequisites: Node.js

1. Install dependencies with `npm install`
2. Start development with `npm run dev`

## Secure features

The project now uses server routes for:

- Gemini requests via `api/ai.ts`
- Admin sponsor sessions via `api/admin/session.ts`

Production or preview deployments must define these environment variables:

```bash
GEMINI_API_KEY=your_gemini_key
EDITOR_ADMIN_PASSCODE=choose_a_private_passcode
ADMIN_SESSION_SECRET=choose_a_long_random_secret
```

## Secure sync setup

The public MQTT broker has been removed. Secure sync now uses Firebase Realtime Database with anonymous auth plus scoped keys.

After deployment:

1. Open the `الحماية والربط` page in the app.
2. Paste your Firebase Web Config.
3. Enable Anonymous Authentication in Firebase Auth.
4. Apply the secure Realtime Database rules shown in the app.

## Build

- `npm run build`
- `npm run lint`
