#!/bin/bash

codex_skill_generated_for_source() {
  local target_dir="$1"
  local source_path="$2"
  local marker="<!-- ACT generated Codex skill from $source_path. Do not edit this installed copy. -->"
  local line

  [ -d "$target_dir" ] || return 1
  [ -f "$target_dir/SKILL.md" ] || return 1
  [ ! -L "$target_dir/SKILL.md" ] || return 1

  while IFS= read -r line; do
    if [[ "$line" == "$marker" ]]; then
      return 0
    fi
  done < "$target_dir/SKILL.md"
  return 1
}

codex_generated_name() {
  local toml_file="$1"
  local line
  local name_regex='^name = "([^"]+)"$'
  while IFS= read -r line; do
    if [[ "$line" =~ $name_regex ]]; then
      echo "${BASH_REMATCH[1]}"
      return 0
    fi
  done < "$toml_file"
  return 1
}

codex_agent_owned_by_this_toolkit() {
  local toml_file="$1"
  local expected="# ACT-TOOLKIT-PATH: $TOOLKIT_PATH"
  local line
  [ -f "$toml_file" ] || return 1
  while IFS= read -r line; do
    if [[ "$line" == "$expected" ]]; then
      return 0
    fi
  done < "$toml_file"
  return 1
}
