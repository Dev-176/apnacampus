# ApnaCampus — Setup & Local Development Guide

## Prerequisites
1. **Node.js**: v20+ recommended
2. **npm** or **yarn**
3. **Expo CLI** (via `npx expo`)
4. **Supabase CLI** (optional for local DB: `npx supabase`)
5. **Android Studio** (for Android Emulator) or Expo Go app on a physical device

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are provided.  
*(Never put service role keys in `.env` or anywhere in the client app!)*

### 3. Start Expo Bundler
```bash
npx expo start
```
- Press `a` to launch on Android emulator
- Scan the QR code using Expo Go on your physical Android device

### 4. Supabase Local Development (Optional)
If using local Supabase:
```bash
npx supabase start
```
Apply migrations:
```bash
npx supabase db reset
```
This boots Postgres, Auth, Inbucket (email testing), and Supabase Studio at `http://127.0.0.1:54323`.

### 5. Type Checking & Code Quality
```bash
npm run typecheck
npm run lint
npm run format
```

---

## Phone OTP (SMS Provider) Setup

Phone OTP is implemented in `features/auth/api/authService.ts` and gated behind the feature flag in [`constants/featureFlags.ts`](file:///C:/Users/Vivek/.gemini/antigravity/scratch/apnacampus/constants/featureFlags.ts):
```ts
export const FEATURE_FLAGS = {
  ENABLE_PHONE_OTP: true, // Switch to true when SMS provider is configured
};
```

### How to configure Twilio in Supabase:
1. Open your **Supabase Dashboard** > **Authentication** > **Providers** > **Phone**.
2. Toggle **Enable Phone Provider**.
3. Select your SMS provider (e.g. **Twilio**, **MessageBird**, **Vonage**, or **Twilio Verify**).
4. Enter your Twilio credentials:
   - **Twilio Account SID**
   - **Twilio Auth Token**
   - **Twilio Message Service SID** or Twilio Phone Number
5. Configure the SMS OTP template (e.g., `Your ApnaCampus verification code is: {{ .Code }}. Valid for 10 minutes.`).
6. In `constants/featureFlags.ts`, set `ENABLE_PHONE_OTP: true`. The Phone OTP tab on the login screen will become active.

---

## Note on Push Notifications (expo-notifications)
Push notifications on Android require a custom development build (`npx expo run:android` or EAS build) with Firebase Cloud Messaging (FCM) credentials configured. Standard Expo Go does not support remote push notifications in recent SDKs.
