#!/bin/bash

parse_tool_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tool)
        if [[ -z "${2+x}" || "$2" == --* ]]; then
          usage
          exit 1
        fi
        TOOL="$2"
        shift 2
        ;;
      --config-dir)
        if [[ -z "${2+x}" || -z "$2" || "$2" == --* ]]; then
          echo -e "${RED}Error: --config-dir requires a non-empty value${NC}"
          usage
          exit 1
        fi
        CONFIG_DIR="$2"
        CONFIG_DIR_PROVIDED=true
        shift 2
        ;;
      *)
        echo -e "${RED}Unknown argument: $1${NC}"
        usage
        exit 1
        ;;
    esac
  done

  if [[ -z "$TOOL" ]]; then
    usage
    exit 1
  fi

  if [[ "$TOOL" != "claude" && "$TOOL" != "opencode" && "$TOOL" != "cursor" && "$TOOL" != "codex" ]]; then
    echo -e "${RED}Invalid tool: $TOOL${NC}"
    usage
    exit 1
  fi

  if [[ "$CONFIG_DIR_PROVIDED" == true && "$TOOL" != "claude" ]]; then
    echo -e "${RED}Error: --config-dir is only supported with --tool claude${NC}"
    usage
    exit 1
  fi
}

resolve_config_path() {
  local raw_path="$1"

  if [[ "$raw_path" == "~" ]]; then
    raw_path="$HOME"
  elif [[ "$raw_path" == ~/* ]]; then
    raw_path="$HOME/${raw_path#~/}"
  fi

  if [[ "$raw_path" == /* ]]; then
    echo "$raw_path"
  else
    echo "$(pwd -P)/$raw_path"
  fi
}

resolve_claude_config_dir() {
  CLAUDE_CONFIG_DIR_RESOLVED=""
  if [[ "$TOOL" == "claude" ]]; then
    if [[ "$CONFIG_DIR_PROVIDED" == true ]]; then
      CLAUDE_CONFIG_DIR_RESOLVED="$(resolve_config_path "$CONFIG_DIR")"
    elif [[ -n "${CLAUDE_CONFIG_DIR:-}" ]]; then
      CLAUDE_CONFIG_DIR_RESOLVED="$(resolve_config_path "$CLAUDE_CONFIG_DIR")"
    else
      CLAUDE_CONFIG_DIR_RESOLVED="$HOME/.claude"
    fi
  fi
}

configure_tool() {
  if [[ "$TOOL" == "claude" ]]; then
    FOLDER_TYPES=("commands" "agents" "skills")
    TOOL_LABEL="Claude Code"
  elif [[ "$TOOL" == "opencode" ]]; then
    FOLDER_TYPES=("commands" "agents" "skills")
    TOOL_LABEL="OpenCode"
  elif [[ "$TOOL" == "codex" ]]; then
    FOLDER_TYPES=("skills" "agents")
    TOOL_LABEL="Codex"
  else
    FOLDER_TYPES=()
    TOOL_LABEL="Cursor"
  fi
}

get_target_dir() {
  local folder_type="$1"
  if [[ "$TOOL" == "claude" ]]; then
    echo "$CLAUDE_CONFIG_DIR_RESOLVED/$folder_type"
  elif [[ "$TOOL" == "codex" && "$folder_type" == "skills" ]]; then
    echo "$HOME/.codex/skills"
  elif [[ "$TOOL" == "codex" && "$folder_type" == "agents" ]]; then
    echo "$HOME/.codex/agents"
  else
    echo "$HOME/.config/opencode/$folder_type"
  fi
}

resolve_symlink_dir_target() {
  local symlink_path="$1"
  local symlink_dir
  local link_target

  if [ ! -L "$symlink_path" ] || [ ! -e "$symlink_path" ]; then
    return 1
  fi

  symlink_dir="$(dirname "$symlink_path")"
  link_target="$(readlink "$symlink_path")"

  (cd "$symlink_dir" && cd "$link_target" 2>/dev/null && pwd -P)
}

is_legacy_act_command_dir() {
  local dir_path="$1"

  [ -d "$dir_path" ] || return 1
  [[ "$dir_path" == */commands/act ]] || return 1

  for legacy_command in help.md update.md update-changelog.md submit-feedback.md; do
    [ -f "$dir_path/$legacy_command" ] || return 1
  done

  return 0
}

is_legacy_act_command_symlink() {
  local symlink_path="$1"
  local resolved_target

  if [ ! -L "$symlink_path" ]; then
    return 1
  fi

  if resolved_target="$(resolve_symlink_dir_target "$symlink_path")"; then
    if [[ "$resolved_target" == "$TOOLKIT_PATH/commands/act" ]]; then
      return 0
    fi

    if is_legacy_act_command_dir "$resolved_target"; then
      return 0
    fi
  fi

  return 1
}

increment_counter() {
  local counter_name="$1"
  eval "$counter_name=\$(( $counter_name + 1 ))"
}

remove_legacy_command_symlink() {
  local target_dir="$1"
  local counter_name="$2"
  local legacy_target="$target_dir/act"

  if ! is_legacy_act_command_symlink "$legacy_target"; then
    return
  fi

  rm "$legacy_target"
  echo -e "  ${GREEN}✓${NC} Removed legacy command symlink $legacy_target"
  increment_counter "$counter_name"
}

cleanup_removed_act_skill_symlinks() {
  local target_dir="$1"
  local counter_name="$2"
  local verbose="$3"
  local prompt_unexpected="${4:-false}"
  local removed_skills_helper="$TOOLKIT_PATH/scripts/lib/removed-skills.sh"

  if [ ! -f "$removed_skills_helper" ]; then
    return
  fi

  # shellcheck disable=SC1090
  source "$removed_skills_helper"

  local legacy_skill
  local legacy_entry
  local legacy_link_target
  local marker
  local line
  local generated_match
  for legacy_skill in "${REMOVED_ACT_SKILLS[@]}"; do
    legacy_entry="$target_dir/$legacy_skill"
    marker="<!-- ACT generated Codex skill from skills/$legacy_skill/SKILL.md. Do not edit this installed copy. -->"
    if [ -L "$legacy_entry" ]; then
      legacy_link_target=$(readlink "$legacy_entry" 2>/dev/null) || continue
      if [[ "$legacy_link_target" == "$TOOLKIT_PATH/skills/"* ]]; then
        if rm "$legacy_entry" 2>/dev/null; then
          if [[ -n "$counter_name" ]]; then
            increment_counter "$counter_name"
          fi
          if [[ "$verbose" == true ]]; then
            echo -e "${GREEN}✓${NC} Removed legacy symlink: $legacy_entry"
          fi
        fi
      fi
    elif [ -d "$legacy_entry" ] && [ -f "$legacy_entry/SKILL.md" ] && [ ! -L "$legacy_entry/SKILL.md" ]; then
      generated_match=false
      while IFS= read -r line; do
        if [[ "$line" == "$marker" ]]; then
          generated_match=true
          if rm -rf "$legacy_entry" 2>/dev/null; then
            if [[ -n "$counter_name" ]]; then
              increment_counter "$counter_name"
            fi
            if [[ "$verbose" == true ]]; then
              echo -e "${GREEN}✓${NC} Removed generated Codex skill: $legacy_entry"
            fi
          fi
          break
        fi
      done < "$legacy_entry/SKILL.md"
      if [[ "$generated_match" != true && "$prompt_unexpected" == true ]]; then
        echo -e "  ${YELLOW}⚠${NC} Skipped unexpected removed ACT skill entry: $legacy_entry"
        read -p "    Remove anyway? [Y/n] " -n 1 -r
        echo ""
        if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
          rm -rf "$legacy_entry"
          echo -e "    ${GREEN}Removed${NC}"
          if [[ -n "$counter_name" ]]; then
            increment_counter "$counter_name"
          fi
        else
          echo -e "    ${CYAN}Kept${NC}"
        fi
      fi
    elif [[ "$prompt_unexpected" == true && -e "$legacy_entry" ]]; then
      echo -e "  ${YELLOW}⚠${NC} Skipped unexpected removed ACT skill entry: $legacy_entry"
      read -p "    Remove anyway? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$legacy_entry"
        echo -e "    ${GREEN}Removed${NC}"
        if [[ -n "$counter_name" ]]; then
          increment_counter "$counter_name"
        fi
      else
        echo -e "    ${CYAN}Kept${NC}"
      fi
    fi
  done
}
