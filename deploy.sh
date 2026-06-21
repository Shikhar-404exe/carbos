#!/bin/bash
echo "Deploying VayuSense to Google Cloud & Firebase..."

GCP_PROJECT_ID="scenic-energy-500112-u4"
FIREBASE_PROJECT_ID="carbon-1c86f"

if [ -z "$GOOGLE_API_KEY" ]; then
    echo "ERROR: GOOGLE_API_KEY environment variable is missing."
    echo "Run: export GOOGLE_API_KEY='your_key' before deploying."
    exit 1
fi

echo "🚀 Deploying Cloud Function 'compute_footprint'..."
gcloud functions deploy compute_footprint \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=functions/ \
  --entry-point=compute_footprint \
  --trigger-http \
  --allow-unauthenticated \
  --project "$GCP_PROJECT_ID" \
  --set-env-vars GOOGLE_API_KEY="${GOOGLE_API_KEY}"

echo "🚀 Deploying to Firebase Hosting & Firestore Rules..."
firebase deploy --only hosting,firestore:rules --project "$FIREBASE_PROJECT_ID"

echo "✅ Deployment complete!"
