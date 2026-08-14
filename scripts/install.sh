#!/bin/bash
# SIPAKAR - Script Instalasi Otomatis (Linux/macOS)
# Jalankan: chmod +x scripts/install.sh && ./scripts/install.sh

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

echo -e "\n${CYAN}=====================================================${NC}"
echo -e "${CYAN}  SIPAKAR - Instalasi Otomatis${NC}"
echo -e "${CYAN}=====================================================${NC}"

# 1. Node.js
echo -e "\n${YELLOW}[1/7] Memeriksa Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js tidak ditemukan${NC}"; exit 1
fi
echo -e "${GREEN}  Node.js $(node --version) ditemukan${NC}"

# 2. Docker
echo -e "${YELLOW}[2/7] Memeriksa Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}  $(docker --version) ditemukan${NC}"
else
    echo -e "${YELLOW}  WARNING: Docker tidak ditemukan${NC}"
fi

# 3. Backend deps
echo -e "${YELLOW}[3/7] Install backend dependencies...${NC}"
cd "$ROOT/backend" && npm install
echo -e "${GREEN}  Selesai${NC}"

# 4. Frontend deps
echo -e "${YELLOW}[4/7] Install frontend dependencies...${NC}"
cd "$ROOT/frontend" && npm install
echo -e "${GREEN}  Selesai${NC}"

# 5. .env files
echo -e "${YELLOW}[5/7] Setup environment files...${NC}"
[ ! -f "$ROOT/backend/.env" ] && cp "$ROOT/backend/.env.example" "$ROOT/backend/.env" && echo -e "${GREEN}  backend/.env dibuat${NC}" || echo -e "  backend/.env sudah ada"
[ ! -f "$ROOT/frontend/.env" ] && cp "$ROOT/frontend/.env.example" "$ROOT/frontend/.env" && echo -e "${GREEN}  frontend/.env dibuat${NC}" || echo -e "  frontend/.env sudah ada"

# 6. PostgreSQL via Docker
echo -e "${YELLOW}[6/7] Menjalankan PostgreSQL...${NC}"
if command -v docker &> /dev/null; then
    docker compose -f "$ROOT/docker-compose.dev.yml" up -d postgres
    echo "  Menunggu PostgreSQL siap..."
    sleep 6
    echo -e "${GREEN}  PostgreSQL berjalan${NC}"
fi

# 7. Migrate & seed
echo -e "${YELLOW}[7/7] Database migration dan seed...${NC}"
cd "$ROOT/backend"
npx prisma generate
npx prisma migrate dev --name init
node prisma/seed.js

echo -e "\n${GREEN}=====================================================${NC}"
echo -e "${GREEN}  INSTALASI SELESAI!${NC}"
echo -e "${GREEN}=====================================================${NC}"
echo -e "\n${CYAN}Cara menjalankan:${NC}"
echo -e "  Backend : cd backend && npm run dev"
echo -e "  Frontend: cd frontend && npm run dev"
echo -e "\n${CYAN}URL:${NC}"
echo -e "  Frontend : http://localhost:5173"
echo -e "  API Docs : http://localhost:3001/api-docs"
echo ""
