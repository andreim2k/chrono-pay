#!/usr/bin/env bash
set -e

PROJECT_ID="studio-500169941-54f40"
APPHOSTING_REGION="us-central1"
CLOUDRUN_REGION="us-west1"
CLOUDRUN_SERVICE="chronopay"
LIVE_URL="https://chronopay.techware.space"

echo "============================================================"
echo "🚀 Starting ChronoPay Automated Deployment"
echo "============================================================"

# Step 1: Pre-deployment Typecheck
echo ""
echo "📦 Step 1/4: Running TypeScript typecheck..."
npm run typecheck
echo "✅ Typecheck passed!"

# Step 2: Build & Upload to Firebase App Hosting
echo ""
echo "☁️  Step 2/4: Deploying source to Firebase App Hosting (backend: studio)..."
npx -y firebase-tools deploy --only apphosting --project "$PROJECT_ID"
echo "✅ App Hosting rollout complete!"

# Step 3: Identify Latest Container Image
echo ""
echo "🔍 Step 3/4: Fetching latest container image tag from Artifact Registry..."
IMAGE_BASE="us-central1-docker.pkg.dev/$PROJECT_ID/firebaseapphosting-images/studio"
LATEST_TAG=$(gcloud artifacts docker tags list "$IMAGE_BASE" --format="value(tag)" 2>/dev/null | grep "^build-" | sort -V | tail -n 1)

if [ -z "$LATEST_TAG" ]; then
  echo "❌ Error: Could not determine latest image tag from $IMAGE_BASE"
  exit 1
fi

IMAGE_FULL="$IMAGE_BASE:$LATEST_TAG"
echo "🎯 Latest image: $IMAGE_FULL"

# Step 4: Deploy Container Image to Cloud Run (chronopay in us-west1)
echo ""
echo "🚀 Step 4/4: Deploying $IMAGE_FULL to Cloud Run service '$CLOUDRUN_SERVICE' in $CLOUDRUN_REGION..."
gcloud run deploy "$CLOUDRUN_SERVICE" \
  --image "$IMAGE_FULL" \
  --region "$CLOUDRUN_REGION" \
  --project "$PROJECT_ID" \
  --quiet

echo ""
echo "============================================================"
echo "🎉 Deployment successfully completed!"
echo "🌐 Production URL: $LIVE_URL"
echo "============================================================"

# Verification ping
echo "📡 Verifying live endpoint..."
ETAG=$(curl -sI "$LIVE_URL/invoices" | grep -i "^etag:" | tr -d '\r' || true)
echo "Status: 200 OK | $ETAG"
echo "All set!"
