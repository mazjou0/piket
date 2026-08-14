#!/bin/bash
# ============================================================
#  SIPAKAR — update.sh
#  Jalankan di VPS: bash update.sh
#  Otomatis: pull terbaru → install deps → migrate → rebuild docker
# ============================================================

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
BRANCH="${1:-main}"

echo -e "\n${CYAN}=================================================${NC}"
echo -e "${CYAN}  SIPAKAR — Update di VPS${NC}"
echo -e "${CYAN}=================================================${NC}"

# Direktori script
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# 1. Pull latest
echo -e "\n${YELLOW}[1/5] Pull dari GitHub (branch: ${BRANCH})...${NC}"
git pull origin "$BRANCH"
echo -e "${GREEN}  Pull selesai${NC}"

# 2. Install/update dependencies backend
echo -e "\n${YELLOW}[2/5] Update backend dependencies...${NC}"
cd "$ROOT/backend"
npm install --production
echo -e "${GREEN}  Backend deps OK${NC}"

# 3. Prisma generate + migrate
echo -e "\n${YELLOW}[3/5] Prisma generate & migrate...${NC}"
npx prisma generate
npx prisma migrate deploy
echo -e "${GREEN}  Database migration selesai${NC}"

cd "$ROOT"

# 4. Build ulang Docker (zero-downtime dengan --no-deps backend dulu)
echo -e "\n${YELLOW}[4/5] Rebuild & restart Docker containers...${NC}"
docker compose pull 2>/dev/null || true
docker compose up -d --build --remove-orphans
echo -e "${GREEN}  Docker containers diperbarui${NC}"

# 5. Bersihkan image lama
echo -e "\n${YELLOW}[5/5] Bersihkan Docker image lama...${NC}"
docker image prune -f
echo -e "${GREEN}  Cleanup selesai${NC}"

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}  UPDATE SELESAI!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "${CYAN}Branch : ${BRANCH}${NC}"
echo -e "${CYAN}Waktu  : $(date '+%Y-%m-%d %H:%M:%S')${NC}\n"

# Cek status container
echo -e "${YELLOW}Status container:${NC}"
docker compose ps
