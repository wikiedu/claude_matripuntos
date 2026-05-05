#!/bin/bash
# Matripuntos — Frontend Deploy Script
# Reads credentials from .deploy-credentials (never committed)
#
# v2.4 audit 10 S1-I-3 hardening:
#   - Ya NO usa --delete: --delete borraría cualquier archivo en el FTP
#     que no esté en dist/. Si en el futuro alojamos uploads de usuarios
#     (proofImageUrl) en /uploads/ del mismo FTP, esos quedarían a salvo.
#     Como contrapartida, asset chunks viejos quedan acumulándose — los
#     limpiamos manualmente cada N deploys con un script ad-hoc.
#   - --only-newer evita re-upload de archivos idénticos (más rápido).
#   - --parallel=4 sube hasta 4 archivos a la vez.
#   - dry-run mode: añade DRY_RUN=1 para sólo previsualizar.

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

if [ ! -d "$DIST" ] || [ ! -f "$DIST/index.html" ]; then
  echo "ERROR: build artifacts not found in $DIST"
  exit 1
fi

DRY_FLAG=""
if [ "${DRY_RUN:-0}" = "1" ]; then
  DRY_FLAG="--dry-run"
  echo "DRY RUN — no files will be uploaded"
fi

echo "Deploying to FTP (no --delete — uploads de usuarios y assets viejos preservados)..."
lftp -c "
set ssl:verify-certificate no
open -u $FTP_USER,$FTP_PASS $FTP_HOST
mirror --reverse --only-newer --parallel=4 --verbose $DRY_FLAG \
  \"$DIST\" \
  /
bye
"

echo "Deploy complete."
echo ""
echo "Notas:"
echo "- Assets viejos en /assets/ siguen ahí; el index.html nuevo apunta a"
echo "  los chunks frescos. Limpieza periódica con scripts/clean-old-assets.sh"
echo "  (cuando se cree)."
