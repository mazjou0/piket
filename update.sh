#!/bin/bash
# ============================================================
#  SIPAKAR — update.sh
#  Jalankan di VPS: bash update.sh
#  Pull terbaru → install deps → migrate → rebuild frontend → restart PM2
# ============================================================

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
BRANCH="${1:-main}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\n${CYAN}=================================================${NC}"
echo -e "${CYAN}  SIPAKAR — Update VPS${NC}"
echo -e "${CYAN}=================================================${NC}"

# 1. Pull dari GitHub
echo -e "\n${YELLOW}[1/5] Pull dari GitHub (branch: ${BRANCH})...${NC}"
cd "$ROOT"
git pull origin "$BRANCH"
echo -e "${GREEN}  Pull selesai${NC}"

# 2. Install/update backend dependencies
echo -e "\n${YELLOW}[2/5] Install semua dependencies (root workspace)...${NC}"
cd "$ROOT"
npm install
echo -e "${GREEN}  Dependencies OK${NC}"

# 3. Prisma generate + migrate
echo -e "\n${YELLOW}[3/5] Prisma generate & migrate...${NC}"
cd "$ROOT/backend"
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}  Database OK${NC}"

# 4. Build frontend
echo -e "\n${YELLOW}[4/5] Build frontend...${NC}"
cd "$ROOT"
npm run build
echo -e "${GREEN}  Frontend build selesai${NC}"

# 5. Restart PM2
echo -e "\n${YELLOW}[5/5] Restart backend (PM2)...${NC}"
cd "$ROOT"
pm2 restart sipakar-backend
pm2 save
echo -e "${GREEN}  PM2 restart selesai${NC}"

# Reload nginx
systemctl reload nginx 2>/dev/null && echo -e "${GREEN}  Nginx reloaded${NC}" || echo -e "${YELLOW}  Nginx reload skip (mungkin perlu sudo)${NC}"

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}  UPDATE SELESAI!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "${CYAN}Branch : ${BRANCH}${NC}"
echo -e "${CYAN}Waktu  : $(date '+%Y-%m-%d %H:%M:%S')${NC}\n"

pm2 status
