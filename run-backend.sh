#!/bin/bash
export PATH="/usr/local/bin:$PATH"
cd /Users/edu/Web\ development/Claude/Matripuntos
node_modules/.bin/tsc -p src/backend && /usr/local/bin/node src/backend/dist/server.js
