#!/bin/bash

echo "🚀 Matripuntos Setup"
echo "===================="
echo ""

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instálalo desde: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"
echo ""

# Install dependencies
echo "📦 Instalando dependencias..."
echo ""
npm install

echo ""
echo "✅ Setup completado!"
echo ""
echo "Ahora abre DOS terminales:"
echo ""
echo "Terminal 1 (Frontend):"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Backend):"
echo "  npm run server"
echo ""
echo "Luego abre: http://localhost:5173"
echo ""
echo "Para más info: cat GETTING_STARTED.md"
