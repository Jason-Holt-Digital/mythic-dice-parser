#!/bin/bash

remove_command_file() {
  local command_file="$1"
  local target_dir="$2"
  local basename
  local target

  basename="$(basename "$command_file")"
  target="$target_dir/$basename"

  remove_toolkit_symlink "$target" "$TOOLKIT_PATH/commands/$basename" true
}

remove_agent_folder() {
  local target="$1"

  if [ -L "$target" ] || [ -d "$target" ]; then
    rm -rf "$target"
    echo -e "  ${GREEN}✓${NC} Removed generated $target"
    total_removed=$((total_removed + 1))
  else
    total_not_found=$((total_not_found + 1))
  fi
}

remove_toolkit_symlink() {
  local target="$1"
  local expected_target="$2"
  local exact_match="${3:-false}"
  local link_target

  if [ -L "$target" ]; then
    link_target=$(readlink "$target")
    if { [ "$exact_match" = true ] && [ "$link_target" = "$expected_target" ]; } || { [ "$exact_match" != true ] && [[ "$link_target" == "$expected_target"* ]]; }; then
      rm "$target"
      echo -e "  ${GREEN}✓${NC} Removed $target"
      total_removed=$((total_removed + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} $target points to: $link_target"
      read -p "    Remove anyway? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        rm "$target"
        echo -e "    ${GREEN}Removed${NC}"
        total_removed=$((total_removed + 1))
      else
        echo -e "    ${CYAN}Kept${NC}"
      fi
    fi
  else
    total_not_found=$((total_not_found + 1))
  fi
}
