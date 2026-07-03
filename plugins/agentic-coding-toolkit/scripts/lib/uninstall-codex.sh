#!/bin/bash

remove_codex_command_skill() {
  local skill_name="$1"
  local command_file="$2"
  local target_dir="$HOME/.codex/skills/$skill_name"
  local source_path="commands/$command_file"

  if codex_skill_generated_for_source "$target_dir" "$source_path"; then
    rm -rf "$target_dir"
    echo -e "  ${GREEN}✓${NC} Removed $target_dir"
    total_removed=$((total_removed + 1))
  elif [ -e "$target_dir" ]; then
    echo -e "  ${YELLOW}⚠${NC} Skipped non-toolkit Codex skill entry: $target_dir"
  else
    total_not_found=$((total_not_found + 1))
  fi
}

remove_codex_skill_dir() {
  local source_dir="$1"
  local target_dir="$2"
  local skill_name="$3"
  local source_path="$4"

  if [[ "$skill_name" != act-* ]]; then
    if [ -e "$target_dir" ]; then
      echo -e "  ${YELLOW}⚠${NC} Skipped non-ACT Codex skill entry: $target_dir"
    else
      total_not_found=$((total_not_found + 1))
    fi
    return
  fi

  if [ ! -L "$target_dir" ] && codex_skill_generated_for_source "$target_dir" "$source_path"; then
    rm -rf "$target_dir"
    echo -e "  ${GREEN}✓${NC} Removed $target_dir"
    total_removed=$((total_removed + 1))
  elif [ -e "$target_dir" ] || [ -L "$target_dir" ]; then
    echo -e "  ${YELLOW}⚠${NC} Skipped non-toolkit Codex skill entry: $target_dir"
  else
    total_not_found=$((total_not_found + 1))
  fi
}

remove_codex_agents() {
  local target_dir="$1"
  local agent_file
  local basename

  [ -d "$target_dir" ] || return
  for agent_file in "$target_dir"/*.toml; do
    [ -f "$agent_file" ] || continue
    basename="$(basename "$agent_file")"
    if codex_agent_owned_by_this_toolkit "$agent_file"; then
      rm "$agent_file"
      echo -e "  ${GREEN}✓${NC} Removed $agent_file"
      total_removed=$((total_removed + 1))
    elif [[ "$basename" == act-* ]]; then
      echo -e "  ${YELLOW}⚠${NC} Skipped non-toolkit Codex agent: $agent_file"
      read -p "    Remove anyway? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        rm "$agent_file"
        echo -e "    ${GREEN}Removed${NC}"
        total_removed=$((total_removed + 1))
      else
        echo -e "    ${CYAN}Kept${NC}"
      fi
    else
      echo -e "  ${YELLOW}⚠${NC} Skipped non-toolkit Codex agent: $agent_file"
      read -p "    Remove anyway? [y/N] " -n 1 -r
      echo ""
      if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$agent_file"
        echo -e "    ${GREEN}Removed${NC}"
        total_removed=$((total_removed + 1))
      else
        echo -e "    ${CYAN}Kept${NC}"
      fi
    fi
  done
}

remove_codex_hook_config() {
  local codex_src="$TOOLKIT_PATH/hooks/codex"
  local codex_dst="$HOME/.codex/hooks/codex"
  local target_hooks="$HOME/.codex/hooks.json"

  if [ ! -f "$codex_src/hooks.json" ]; then
    echo -e "  ${CYAN}•${NC} Codex hook source config not found (already removed from toolkit)"
    return
  fi

  if ! node "$TOOLKIT_PATH/scripts/lib/install-codex-hooks.js" --remove --target "$target_hooks" --hook-dir "$codex_dst" "$codex_src/hooks.json"; then
    echo -e "  ${RED}✗${NC} Failed to remove Codex hooks from $target_hooks"
    exit 1
  fi
  echo -e "  ${GREEN}✓${NC} Removed ACT-owned Codex hook entries"
}

remove_codex_hook_scripts() {
  local core_src="$TOOLKIT_PATH/hooks/core"
  local codex_src="$TOOLKIT_PATH/hooks/codex"
  local core_dst="$HOME/.codex/hooks/core"
  local codex_dst="$HOME/.codex/hooks/codex"
  local source_file
  local target_file

  for source_file in "$core_src"/*.js; do
    [ -f "$source_file" ] || continue
    target_file="$core_dst/$(basename "$source_file")"
    if [ -e "$target_file" ]; then
      rm -f "$target_file"
      echo -e "  ${GREEN}✓${NC} Removed $target_file"
      total_removed=$((total_removed + 1))
    fi
  done

  for source_file in "$codex_src"/*.js; do
    [ -f "$source_file" ] || continue
    target_file="$codex_dst/$(basename "$source_file")"
    if [ -e "$target_file" ]; then
      rm -f "$target_file"
      echo -e "  ${GREEN}✓${NC} Removed $target_file"
      total_removed=$((total_removed + 1))
    fi
  done

  rmdir "$codex_dst" 2>/dev/null || true
  rmdir "$core_dst" 2>/dev/null || true
  rmdir "$HOME/.codex/hooks" 2>/dev/null || true
}
