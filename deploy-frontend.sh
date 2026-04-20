#!/bin/bash
# Matripuntos — Frontend Deploy Script
# Reads credentials from .deploy-credentials (never committed)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CREDS="$SCRIPT_DIR/.deploy-credentials"
DIST="$SCRIPT_DIR/src/frontend/dist"

if [ ! -f "$CREDS" ]; then
  echo "ERROR: .deploy-credentials not found"
  exit 1
fi

source "$CREDS"

echo "Building frontend..."
cd "$SCRIPT_DIR/src/frontend"
npm run build

echo "Deploying to FTP..."
lftp -c "
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mirror --reverse --delete --verbose \
  $DIST \
  /
bye
"

echo "Deploy complete."
