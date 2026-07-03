#!/bin/bash

set -euo pipefail

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  BLUE=''
  CYAN=''
  GREEN=''
  YELLOW=''
  BOLD=''
  NC=''
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: npx is required but was not found in PATH." >&2
  echo "Install Node.js from https://nodejs.org/ and try again." >&2
  exit 1
fi

printf "${BOLD}${BLUE}Official Dart/Flutter Team Skills${NC}\n\n"
printf "${CYAN}These skills are *not* part of ACT and can be installed with the upstream skills installer.${NC}\n\n"

printf "${BOLD}${GREEN}Install all official Flutter and Dart team skills:${NC}\n\n"
printf "  ${YELLOW}npx skills add flutter/skills --skill '*'${NC}\n\n"
printf "  ${YELLOW}npx skills add dart-lang/skills --skill '*'${NC}\n\n"

printf "${BOLD}${GREEN}Update installed upstream skills:${NC}\n\n"
printf "  ${YELLOW}npx skills update${NC}\n\n"

printf "${BOLD}${GREEN}Learn more:${NC}\n\n"
printf "  ${CYAN}https://github.com/flutter/skills${NC}\n\n"
printf "  ${CYAN}https://github.com/dart-lang/skills${NC}\n\n"
