#!/bin/bash

install_codex_command_skill() {
  local skill_name="$1"
  local command_file="$2"
  local target_dir="$HOME/.codex/skills/$skill_name"
  local target="$target_dir/SKILL.md"
  local source_path="$TOOLKIT_PATH/commands/$command_file"
  local source_marker_path="commands/$command_file"
  local target_exists=false

  if [ ! -f "$source_path" ]; then
    echo -e "  ${RED}✗${NC} Missing command source: $source_path"
    exit 1
  fi

  if [ -e "$target_dir" ] || [ -L "$target_dir" ]; then
    target_exists=true
    if [ -L "$target_dir" ] || ! codex_skill_generated_for_source "$target_dir" "$source_marker_path"; then
      echo -e "  ${YELLOW}⚠${NC} $target_dir is not an ACT-generated Codex skill"
      read -p "    Replace with generated ACT Codex skill? [Y/n] " -n 1 -r
      echo ""
      if [[ -n "$REPLY" && ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "    ${CYAN}Kept existing${NC}"
        return
      fi
    fi
    rm -rf "$target_dir"
  fi

  if ! mkdir -p "$target_dir"; then
    echo -e "  ${RED}✗${NC} Failed to create directory: $target_dir"
    exit 1
  fi

  if ! node "$ACT_SKILL_CODEX_TRANSFORM_SCRIPT" --input "$source_path" --output "$target" --source-path "$source_marker_path"; then
    echo -e "  ${RED}✗${NC} Failed to generate Codex skill from $source_path"
    rm -rf "$target_dir"
    exit 1
  fi

  if [ "$target_exists" = true ]; then
    total_replaced=$((total_replaced + 1))
    echo -e "  ${GREEN}✓${NC} $target_dir ${GREEN}(regenerated)${NC}"
  else
    total_new=$((total_new + 1))
    echo -e "  ${GREEN}✓${NC} $target_dir ${GREEN}(generated)${NC}"
  fi
}

install_codex_skill_dir() {
  local source_dir="$1"
  local target_dir="$2"
  local source_path="$3"
  local source_skill="$source_dir/SKILL.md"
  local tmp_dir="$target_dir.tmp.$$"
  local target_exists=false
  local replace_allowed=false
  local entry
  local basename

  if [ ! -f "$source_skill" ]; then
    echo -e "  ${RED}✗${NC} Missing skill source: $source_skill"
    exit 1
  fi

  if [ -e "$target_dir" ] || [ -L "$target_dir" ]; then
    target_exists=true
    if [ ! -L "$target_dir" ] && codex_skill_generated_for_source "$target_dir" "$source_path"; then
      replace_allowed=true
    else
      echo -e "  ${YELLOW}⚠${NC} $target_dir exists and is not an ACT-generated Codex skill"
      read -p "    Replace with generated ACT Codex skill? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        replace_allowed=true
      fi
    fi
  else
    replace_allowed=true
  fi

  if [ "$replace_allowed" != true ]; then
    echo -e "    ${CYAN}Kept existing${NC}"
    return
  fi

  rm -rf "$tmp_dir"
  if ! mkdir -p "$tmp_dir"; then
    echo -e "  ${RED}✗${NC} Failed to create temporary directory: $tmp_dir"
    exit 1
  fi

  if ! node "$ACT_SKILL_CODEX_TRANSFORM_SCRIPT" --input "$source_skill" --output "$tmp_dir/SKILL.md" --source-path "$source_path"; then
    echo -e "  ${RED}✗${NC} Failed to generate Codex skill from $source_skill"
    rm -rf "$tmp_dir"
    exit 1
  fi

  for entry in "$source_dir"/*; do
    [ -e "$entry" ] || continue
    basename="$(basename "$entry")"
    if [[ "$basename" == "SKILL.md" ]]; then
      continue
    fi
    if ! ln -s "$entry" "$tmp_dir/$basename"; then
      echo -e "  ${RED}✗${NC} Failed to link Codex skill auxiliary entry: $entry"
      rm -rf "$tmp_dir"
      exit 1
    fi
  done

  if [ "$target_exists" = true ]; then
    rm -rf "$target_dir"
  fi
  if ! mv "$tmp_dir" "$target_dir"; then
    echo -e "  ${RED}✗${NC} Failed to install generated Codex skill: $target_dir"
    rm -rf "$tmp_dir"
    exit 1
  fi

  if [ "$target_exists" = true ]; then
    total_replaced=$((total_replaced + 1))
    echo -e "  ${GREEN}✓${NC} $target_dir ${GREEN}(regenerated)${NC}"
  else
    total_new=$((total_new + 1))
    echo -e "  ${GREEN}✓${NC} $target_dir ${GREEN}(generated)${NC}"
  fi
}

install_codex_agents() {
  local source_dir="$1"
  local target_dir="$2"
  local agent_file
  local temp_output
  local agent_name
  local target
  local replaced_existing

  for agent_file in "$source_dir"/*.md; do
    [ -f "$agent_file" ] || continue
    temp_output="$target_dir/.tmp-$(basename "$agent_file" .md)-$$.toml"
    if ! node "$ACT_AGENT_TRANSFORM_SCRIPT" --tool codex --input "$agent_file" --output "$temp_output"; then
      echo -e "  ${RED}✗${NC} Failed to generate Codex agent from $agent_file to $temp_output"
      rm -f "$temp_output"
      exit 1
    fi
    if [ ! -f "$temp_output" ]; then
      echo -e "  ${RED}✗${NC} Missing generated Codex agent: $temp_output"
      exit 1
    fi
    if ! agent_name="$(codex_generated_name "$temp_output")"; then
      echo -e "  ${RED}✗${NC} Generated Codex agent is missing name: $temp_output"
      rm -f "$temp_output"
      exit 1
    fi
    target="$target_dir/$agent_name.toml"
    replaced_existing=false

    if [ -e "$target" ]; then
      if codex_agent_owned_by_this_toolkit "$target"; then
        replaced_existing=true
      else
        echo -e "  ${YELLOW}⚠${NC} $target exists and is not owned by this toolkit"
        read -p "    Replace with generated ACT agent? [Y/n] " -n 1 -r
        echo ""
        if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
          replaced_existing=true
        else
          echo -e "    ${CYAN}Kept existing${NC}"
          rm -f "$temp_output"
          continue
        fi
      fi
    fi

    if ! mv "$temp_output" "$target"; then
      echo -e "  ${RED}✗${NC} Failed to install Codex agent: $target"
      rm -f "$temp_output"
      exit 1
    fi
    if [ "$replaced_existing" = true ]; then
      total_replaced=$((total_replaced + 1))
    else
      total_new=$((total_new + 1))
    fi
    total_agent_files=$((total_agent_files + 1))
  done
}

install_codex_hook_scripts() {
  local core_src="$TOOLKIT_PATH/hooks/core"
  local codex_src="$TOOLKIT_PATH/hooks/codex"
  local core_dst="$HOME/.codex/hooks/core"
  local codex_dst="$HOME/.codex/hooks/codex"
  local file

  if [ ! -d "$core_src" ]; then
    echo -e "  ${RED}✗${NC} Missing Codex hook core source: $core_src"
    exit 1
  fi
  if [ ! -d "$codex_src" ]; then
    echo -e "  ${RED}✗${NC} Missing Codex hook source: $codex_src"
    exit 1
  fi
  if [ ! -f "$codex_src/hooks.json" ]; then
    echo -e "  ${RED}✗${NC} Missing Codex hook config: $codex_src/hooks.json"
    exit 1
  fi

  if ! mkdir -p "$core_dst" "$codex_dst"; then
    echo -e "  ${RED}✗${NC} Failed to create Codex hook directories"
    exit 1
  fi

  for file in "$core_src"/*.js; do
    [ -f "$file" ] || continue
    cp "$file" "$core_dst/" || exit 1
  done
  for file in "$codex_src"/*.js; do
    [ -f "$file" ] || continue
    cp "$file" "$codex_dst/" || exit 1
  done

  echo -e "  ${GREEN}✓${NC} Copied Codex hook scripts to $core_dst and $codex_dst"
}

install_codex_hook_config() {
  local codex_src="$TOOLKIT_PATH/hooks/codex"
  local codex_dst="$HOME/.codex/hooks/codex"
  local target_hooks="$HOME/.codex/hooks.json"

  if ! node "$TOOLKIT_PATH/scripts/lib/install-codex-hooks.js" --target "$target_hooks" --hook-dir "$codex_dst" "$codex_src/hooks.json"; then
    echo -e "  ${RED}✗${NC} Failed to merge Codex hooks into $target_hooks"
    exit 1
  fi
  echo -e "  ${GREEN}✓${NC} Updated $target_hooks"
}
