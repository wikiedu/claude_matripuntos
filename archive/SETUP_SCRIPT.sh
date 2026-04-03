#!/bin/bash

# 🚀 MATRIPUNTOS V2 — SCRIPT DE SETUP COMPLETO
# Ejecutar: bash SETUP_SCRIPT.sh

set -e  # Exit on error

echo "════════════════════════════════════════════════════════════"
echo "🚀 MATRIPUNTOS V2 — SETUP COMPLETO"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ===== BACKEND SETUP =====
echo -e "${BLUE}📦 BACKEND SETUP${NC}"
echo "────────────────────────────────────────────────────────────"

cd src/backend

echo "1️⃣  Installing dependencies..."
npm install

echo ""
echo "2️⃣  Generating Prisma client..."
npx prisma generate

echo ""
echo "3️⃣  Running migrations..."
npx prisma migrate deploy

echo ""
echo "4️⃣  Seeding database with categories & achievements..."
npm run seed

echo -e "${GREEN}✅ Backend setup completed!${NC}"
echo ""

# ===== FRONTEND SETUP =====
echo -e "${BLUE}📦 FRONTEND SETUP${NC}"
echo "────────────────────────────────────────────────────────────"

cd ../frontend

echo "1️⃣  Installing dependencies..."
npm install

echo -e "${GREEN}✅ Frontend setup completed!${NC}"
echo ""

# ===== SUMMARY =====
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ SETUP COMPLETED SUCCESSFULLY!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${YELLOW}🚀 NEXT STEPS:${NC}"
echo ""
echo "1. Open TWO terminals:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ cd src/backend && npm run dev"
echo "   → Server will run on http://localhost:3000"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   $ cd src/frontend && npm run dev"
echo "   → App will open on http://localhost:5173"
echo ""
echo "2. Go to http://localhost:5173 in your browser"
echo ""
echo "3. Test the application:"
echo "   - Register with email/password"
echo "   - Complete onboarding (4 steps)"
echo "   - Create events and negotiate"
echo "   - Check achievements and leaderboard"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_START.md - Quick reference"
echo "   - PHASE1_TESTING_GUIDE.md - Testing FASE 1"
echo "   - PHASE3_TESTING_GUIDE.md - Testing FASE 3"
echo "   - V4_FINAL_PROGRESS.md - Complete overview"
echo ""
echo "════════════════════════════════════════════════════════════"
