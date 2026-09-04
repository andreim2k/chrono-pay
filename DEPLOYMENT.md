# ChronoPay Architecture & Deployment Guide

## Overview

ChronoPay uses a two-tier Google Cloud setup:

1. **Firebase App Hosting (`studio` in `us-central1`)**:
   - Compiles the Next.js application into a production standalone container image.
   - Uploads container images to Artifact Registry at:
     `us-central1-docker.pkg.dev/studio-500169941-54f40/firebaseapphosting-images/studio`

2. **Google Cloud Run (`chronopay` in `us-west1`)**:
   - Runs the container image produced by App Hosting.
   - The custom production domain **`https://chronopay.techware.space`** routes directly to this Cloud Run service.

---

## 1. Running Locally

### Option A: Standard Dev Server
```bash
npm run dev
```
Starts Next.js with Turbopack on port `9002` (`http://localhost:9002`).

### Option B: Clean Start (Auto-kill lingering port)
If port `9002` ever gets blocked by a background process:
```bash
npm run dev:clean
# or
./scripts/run-local.sh
```
This automatically frees port 9002 and launches the dev server cleanly.

---

## 2. Deploying to Production (One Command)

To deploy changes to the live production site (`https://chronopay.techware.space`):

```bash
npm run deploy
# or
./scripts/deploy.sh
```

### What `deploy.sh` does automatically:
1. **Runs Typecheck**: `npm run typecheck` (`tsc --noEmit`) to ensure zero errors.
2. **Builds Container in App Hosting**: Triggers `firebase-tools deploy --only apphosting`, building the new Next.js standalone container.
3. **Finds Latest Image Tag**: Automatically queries Google Artifact Registry for the latest `build-YYYY-MM-DD-XXX` tag.
4. **Rolls Out to Cloud Run**: Updates the Cloud Run service `chronopay` in `us-west1` with the new container image.
5. **Verifies Live Health**: Pings `https://chronopay.techware.space/invoices` and reports the new ETag.

---

## Git Workflow Reminder
Whenever making changes:
```bash
git add .
git commit -m "feat/fix: description"
git push origin main
npm run deploy
```
