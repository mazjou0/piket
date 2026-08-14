#!/bin/bash
# ============================================================
#  SIPAKAR — push.sh
#  Jalankan dari lokal (Git Bash): bash push.sh "pesan commit"
# ============================================================

set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

COMMIT_MSG="${1:-update: $(date '+%Y-%m-%d %H:%M')}"
BRANCH="${2:-main}"

echo -e "\n${CYAN}=================================================${NC}"
echo -e "${CYAN}  SIPAKAR — Push ke GitHub${NC}"
echo -e "${CYAN}=================================================${NC}"

# Pastikan ada perubahan
echo -e "\n${YELLOW}[1/4] Cek status git...${NC}"
git status

# Stage semua perubahan
echo -e "\n${YELLOW}[2/4] Stage semua perubahan...${NC}"
git add -A
echo -e "${GREEN}  Semua file di-stage${NC}"

# Commit
echo -e "\n${YELLOW}[3/4] Commit: \"${COMMIT_MSG}\"${NC}"
git diff --cached --quiet && echo -e "${YELLOW}  Tidak ada perubahan baru, skip commit.${NC}" || git commit -m "$COMMIT_MSG"

# Push
echo -e "\n${YELLOW}[4/4] Push ke origin/${BRANCH}...${NC}"
git push origin "$BRANCH"

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}  PUSH SELESAI!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "${CYAN}Branch  : ${BRANCH}${NC}"
echo -e "${CYAN}Commit  : ${COMMIT_MSG}${NC}\n"
