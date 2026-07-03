#!/bin/bash

install_agent_folder() {
  local source_dir="$1"
  local target_dir="$2"
  local dirname="$3"
  local source_path="$4"

  if [ -L "$target_dir" ]; then
    local link_target
    local resolved_target
    link_target=$(readlink "$target_dir")
    if resolved_target="$(resolve_symlink_dir_target "$target_dir")" && [ "$resolved_target" = "$source_path" ]; then
      rm "$target_dir"
      echo -e "  ${GREEN}✓${NC} Replaced legacy agent symlink $target_dir"
      total_replaced=$((total_replaced + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} $target_dir points to: $link_target"
      read -p "    Replace with generated ACT agents? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        rm "$target_dir"
        echo -e "    ${GREEN}Replaced${NC}"
        total_replaced=$((total_replaced + 1))
      else
        echo -e "    ${CYAN}Kept existing${NC}"
        return
      fi
    fi
  elif [ -e "$target_dir" ] && [ ! -d "$target_dir" ]; then
    echo -e "  ${YELLOW}⚠${NC} $target_dir exists and is not a directory"
    read -p "    Replace with generated ACT agents? [Y/n] " -n 1 -r
    echo ""
    if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
      rm -f "$target_dir"
      echo -e "    ${GREEN}Replaced${NC}"
      total_replaced=$((total_replaced + 1))
    else
      echo -e "    ${CYAN}Kept existing${NC}"
      return
    fi
  fi

  if [ -d "$target_dir" ]; then
    rm -rf "$target_dir"
    total_existing=$((total_existing + 1))
  else
    total_new=$((total_new + 1))
  fi

  mkdir -p "$target_dir"

  local agent_file
  local copied_any=false
  for agent_file in "$source_dir"/*.md; do
    if [ -f "$agent_file" ]; then
      copied_any=true
      if ! node "$ACT_AGENT_TRANSFORM_SCRIPT" --tool "$TOOL" --input "$agent_file" --output "$target_dir/$(basename "$agent_file")"; then
        echo -e "  ${RED}✗${NC} Failed to generate $target_dir/$(basename "$agent_file")"
        exit 1
      fi
      total_agent_files=$((total_agent_files + 1))
    fi
  done

  if [ "$copied_any" = true ]; then
    echo -e "  ${GREEN}✓${NC} $target_dir ${GREEN}(generated)${NC}"
  fi
}

install_command_file() {
  local command_file="$1"
  local target_dir="$2"
  local basename
  local source_path
  local target

  basename="$(basename "$command_file")"
  source_path="$(cd "$(dirname "$command_file")" && pwd -P)/$basename"
  target="$target_dir/$basename"

  install_source_file_symlink "$source_path" "$target"
}

install_source_file_symlink() {
  local source_path="$1"
  local target="$2"

  if [ -L "$target" ]; then
    link_target=$(readlink "$target")
    if [[ "$link_target" == "$source_path" ]]; then
      echo -e "  ${GREEN}✓${NC} $target ${CYAN}(already exists)${NC}"
      total_existing=$((total_existing + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} $target points to: $link_target"
      read -p "    Replace with this toolkit? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        rm "$target"
        ln -s "$source_path" "$target"
        echo -e "    ${GREEN}Replaced${NC}"
        total_replaced=$((total_replaced + 1))
      else
        echo -e "    ${CYAN}Kept existing${NC}"
      fi
    fi
  elif [ -e "$target" ]; then
    echo -e "  ${YELLOW}⚠${NC} $target exists and is not a symlink"
    read -p "    Replace with this toolkit? [Y/n] " -n 1 -r
    echo ""
    if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
      rm -f "$target"
      ln -s "$source_path" "$target"
      echo -e "    ${GREEN}Replaced${NC}"
      total_replaced=$((total_replaced + 1))
    else
      echo -e "    ${CYAN}Kept existing${NC}"
    fi
  else
    ln -s "$source_path" "$target"
    echo -e "  ${GREEN}✓${NC} $target ${GREEN}(new)${NC}"
    total_new=$((total_new + 1))
  fi
}
