#!/bin/bash

# 🚀 MATRIPUNTOS V2 — SETUP COPY & PASTE
# Ejecuta esto si tienes Node.js 18+ instalado

echo "════════════════════════════════════════════════════════════"
echo "🚀 MATRIPUNTOS V2 — SETUP COPY & PASTE"
echo "════════════════════════════════════════════════════════════"
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado"
    echo "📥 Descarga desde: https://nodejs.org/"
    echo "   Requiere: v18 o superior"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"
echo ""

# BACKEND SETUP
echo "════════════════════════════════════════════════════════════"
echo "📦 BACKEND SETUP"
echo "════════════════════════════════════════════════════════════"
echo ""

cd "src/backend"

echo "1️⃣  npm install"
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error en npm install"
    exit 1
fi

echo ""
echo "2️⃣  npx prisma generate"
npx prisma generate
if [ $? -ne 0 ]; then
    echo "❌ Error en prisma generate"
    exit 1
fi

echo ""
echo "3️⃣  npx prisma migrate deploy"
npx prisma migrate deploy
if [ $? -ne 0 ]; then
    echo "❌ Error en prisma migrate"
    exit 1
fi

echo ""
echo "4️⃣  npm run seed"
npm run seed
if [ $? -ne 0 ]; then
    echo "❌ Error en npm seed"
    exit 1
fi

echo ""
echo "✅ Backend setup completado!"
echo ""

# FRONTEND SETUP
echo "════════════════════════════════════════════════════════════"
echo "📦 FRONTEND SETUP"
echo "════════════════════════════════════════════════════════════"
echo ""

cd "../frontend"

echo "1️⃣  npm install"
npm install
if [ $? -ne 0 ]; then
    echo "❌ Error en npm install (frontend)"
    exit 1
fi

echo ""
echo "✅ Frontend setup completado!"
echo ""

# RESUMEN FINAL
echo "════════════════════════════════════════════════════════════"
echo "✅ SETUP COMPLETADO!"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "🎉 Ahora ejecuta en DOS TERMINALES DIFERENTES:"
echo ""
echo "   Terminal 1 (Backend):"
echo "   $ cd src/backend && npm run dev"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   $ cd src/frontend && npm run dev"
echo ""
echo "📱 Abre en navegador:"
echo "   http://localhost:5173"
echo ""
echo "════════════════════════════════════════════════════════════"
