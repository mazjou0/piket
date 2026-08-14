#!/bin/bash
# ============================================================
#  reconnect-git.sh
#  Jalankan SEKALI di Git Bash untuk menghubungkan ulang repo
#  ke GitHub setelah folder .git hilang.
#
#  Usage: bash scripts/reconnect-git.sh https://github.com/USERNAME/REPO.git
# ============================================================

set -e
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'

GITHUB_URL="${1}"

if [ -z "$GITHUB_URL" ]; then
  echo -e "${RED}ERROR: URL GitHub wajib diisi!${NC}"
  echo -e "Usage: bash scripts/reconnect-git.sh https://github.com/USERNAME/REPO.git"
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo -e "\n${CYAN}=================================================${NC}"
echo -e "${CYAN}  Reconnect Git ke GitHub${NC}"
echo -e "${CYAN}=================================================${NC}"

# Init git baru
echo -e "\n${YELLOW}[1/5] Init git repository...${NC}"
git init
git branch -M main
echo -e "${GREEN}  Git init selesai${NC}"

# Set remote
echo -e "\n${YELLOW}[2/5] Set remote origin: ${GITHUB_URL}${NC}"
git remote add origin "$GITHUB_URL"
echo -e "${GREEN}  Remote ditambahkan${NC}"

# Stage semua file
echo -e "\n${YELLOW}[3/5] Stage semua file...${NC}"
git add -A
echo -e "${GREEN}  File di-stage${NC}"

# Commit
echo -e "\n${YELLOW}[4/5] Initial commit...${NC}"
git commit -m "chore: reconnect repo — restore after .git loss"
echo -e "${GREEN}  Commit selesai${NC}"

# Push (force karena repo remote mungkin punya history berbeda)
echo -e "\n${YELLOW}[5/5] Push ke GitHub (force)...${NC}"
echo -e "${YELLOW}  PERHATIAN: --force akan menimpa history di GitHub!${NC}"
echo -e "${YELLOW}  Tekan Ctrl+C untuk batal, atau Enter untuk lanjut...${NC}"
read -r

git push -u origin main --force

echo -e "\n${GREEN}=================================================${NC}"
echo -e "${GREEN}  RECONNECT SELESAI!${NC}"
echo -e "${GREEN}=================================================${NC}"
echo -e "${CYAN}Remote : ${GITHUB_URL}${NC}"
echo -e "${CYAN}Branch : main${NC}\n"
echo -e "Selanjutnya gunakan: ${CYAN}bash push.sh \"pesan commit\"${NC}\n"
