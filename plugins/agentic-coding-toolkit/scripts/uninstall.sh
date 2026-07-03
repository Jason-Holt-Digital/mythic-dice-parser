#!/bin/bash

# Remove symlinks for Claude Code, OpenCode, Cursor plugin, or Codex installs.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLKIT_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$TOOLKIT_PATH/.act-project-local-install" ]]; then
  echo "This is a project-local ACT plugin copy. Do not run the global ACT installer/uninstaller from here." >&2
  echo "Refresh this plugin from the source checkout instead: /Users/jholt/.agentic-coding-toolkit" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/common.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/codex.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/uninstall.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/uninstall-codex.sh"

# ============================================================
# Parse arguments (all tools)
# ============================================================
TOOL=""
CONFIG_DIR=""
CONFIG_DIR_PROVIDED=false

usage() {
  echo "Usage: uninstall.sh --tool [claude|opencode|cursor|codex] [--config-dir <path>]"
}

parse_tool_args "$@"
resolve_claude_config_dir

# ============================================================
# Configure target folders and labels (all tools)
# ============================================================
configure_tool

echo -e "${BLUE}Removing $TOOL_LABEL symlinks...${NC}"
echo ""

# Track totals
total_removed=0
total_not_found=0

CURSOR_PLUGIN_LINK="$HOME/.cursor/plugins/local/agentic-coding-toolkit"

# Shared ACT config artifacts are intentionally left in place for all tools so
# reinstall can reuse settings and runtime helper paths.

# Cursor local plugin uninstall (Cursor only)
# Cursor does not use command/agent/skill target folders here, so it exits after
# plugin symlink handling.
if [[ "$TOOL" == "cursor" ]]; then
  if [ -L "$CURSOR_PLUGIN_LINK" ]; then
    link_target=$(readlink "$CURSOR_PLUGIN_LINK")
    if resolved_target="$(resolve_symlink_dir_target "$CURSOR_PLUGIN_LINK")" && [ "$resolved_target" = "$TOOLKIT_PATH" ]; then
      rm "$CURSOR_PLUGIN_LINK"
      echo -e "  ${GREEN}✓${NC} Removed $CURSOR_PLUGIN_LINK"
      total_removed=$((total_removed + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} Skipped non-toolkit Cursor plugin symlink: $CURSOR_PLUGIN_LINK -> $link_target"
    fi
  elif [ -e "$CURSOR_PLUGIN_LINK" ]; then
    echo -e "  ${YELLOW}⚠${NC} Skipped non-symlink Cursor plugin entry: $CURSOR_PLUGIN_LINK"
  else
    echo -e "  ${CYAN}•${NC} Cursor plugin link not found (already removed)"
  fi

  echo ""
  echo -e "${GREEN}✓ Removed $total_removed symlink(s)${NC}"
  echo ""
  echo -e "${CYAN}•${NC} Restart or reload Cursor to unload any already-open ACT plugin session"
  echo -e "${CYAN}•${NC} If this ACT repo is open in Cursor, /act-* skills can remain visible from the current workspace or recent skill history until reload"
  echo ""
  echo -e "${CYAN}•${NC} Left shared ACT config artifacts untouched under $HOME/.config/agentic-coding-toolkit"
  exit 0
fi

# Node preflight (Claude/OpenCode/Codex only)
# Node is required for Claude hook removal and kept as a shared non-Cursor
# preflight to match install-time Node-dependent behavior.
if ! command -v node &>/dev/null; then
  echo -e "${RED}Error: Node.js is required but not found in PATH.${NC}"
  echo "Node is needed to remove hooks from settings.json."
  echo "Install Node.js from https://nodejs.org/ and try again."
  exit 1
fi

# Process command/agent/skill folders (Claude/OpenCode/Codex only)
# Cursor exits earlier. Claude/OpenCode remove command, agent, and skill entries;
# Codex removes generated skills and custom-agent TOML files.
for folder_type in "${FOLDER_TYPES[@]}"; do
  SOURCE_DIR="$TOOLKIT_PATH/$folder_type"
  TARGET_DIR="$(get_target_dir "$folder_type")"

  # Skip missing source folders for the current tool.
  if [ ! -d "$SOURCE_DIR" ]; then
    continue
  fi

  if [[ "$folder_type" == "commands" ]]; then
    # Commands are removed for Claude/OpenCode. Codex command-backed skills are
    # removed later as `act-help` and `act-update` skill entries.
    for command_file in "$SOURCE_DIR"/*.md; do
      if [ -f "$command_file" ]; then
        remove_command_file "$command_file" "$TARGET_DIR"
      fi
    done
    remove_legacy_command_symlink "$TARGET_DIR" total_removed
    continue
  fi

  if [[ "$TOOL" == "codex" && "$folder_type" == "agents" ]]; then
    remove_codex_agents "$TARGET_DIR"
    continue
  fi

  # Remove agents or skills for each source subdirectory.
  for dir in "$SOURCE_DIR"/*/; do
    if [ -d "$dir" ]; then
      dirname=$(basename "$dir")
      target="$TARGET_DIR/$dirname"

      if [[ "$TOOL" == "codex" && "$folder_type" == "skills" ]]; then
        remove_codex_skill_dir "$SOURCE_DIR/$dirname" "$target" "$dirname" "skills/$dirname/SKILL.md"
        continue
      fi

      if [[ "$folder_type" == "agents" ]]; then
        # Claude/OpenCode generated agent directory removal.
        remove_agent_folder "$target"
      elif [ -L "$target" ]; then
        # Claude/OpenCode skill symlink removal.
        remove_toolkit_symlink "$target" "$TOOLKIT_PATH"
      else
        total_not_found=$((total_not_found + 1))
      fi
    fi
  done
done

# Codex command-backed skills (Codex only)
if [[ "$TOOL" == "codex" ]]; then
  remove_codex_command_skill "act-help" "act-help.md"
  remove_codex_command_skill "act-update" "act-update.md"
fi

# ============================================================
# Removed skill cleanup (Claude/OpenCode/Codex only)
# Silently absorb stale ACT-owned symlinks for skills that have been removed
# from `skills/`. The main loop above only iterates current `skills/*/`, so it
# never sees these. Never fails parent.
# ============================================================
LEGACY_SKILLS_TARGET_DIR="$(get_target_dir skills)"
if [[ "$TOOL" != "codex" ]]; then
  cleanup_removed_act_skill_symlinks "$LEGACY_SKILLS_TARGET_DIR" total_removed false
fi

# Removal summary (Claude/OpenCode/Codex only)
echo ""
echo -e "${GREEN}✓ Removed $total_removed symlink(s)${NC}"

# ============================================================
# Hook cleanup (Claude/Codex only)
# ============================================================
if [[ "$TOOL" == "claude" ]]; then
  # Claude only: remove hooks from the resolved Claude settings.json.
  HOOKS_FILE="$TOOLKIT_PATH/hooks/hooks.json"
  if [ -f "$HOOKS_FILE" ]; then
    echo ""
    echo -e "${BLUE}Removing hooks...${NC}"
    node "$TOOLKIT_PATH/scripts/lib/install-hooks.js" --remove --settings "$CLAUDE_CONFIG_DIR_RESOLVED/settings.json" --hook-dir "$CLAUDE_CONFIG_DIR_RESOLVED/hooks/claude" "$HOOKS_FILE"
  fi

  # Claude only: remove hook scripts from the resolved Claude hooks directories.
  HOOK_CORE_DST="$CLAUDE_CONFIG_DIR_RESOLVED/hooks/core"
  HOOK_CLAUDE_DST="$CLAUDE_CONFIG_DIR_RESOLVED/hooks/claude"
  REMOVED_HOOKS=false
  echo ""
  echo -e "${BLUE}Removing hook scripts...${NC}"
  for dir in "$HOOK_CORE_DST" "$HOOK_CLAUDE_DST"; do
    if [ -d "$dir" ]; then
      rm -f "$dir"/*.js
      rmdir "$dir" 2>/dev/null
      echo -e "  ${GREEN}✓${NC} Removed $dir"
      REMOVED_HOOKS=true
    fi
  done
  # Claude only: also clean up legacy flat hooks/scripts directory if present.
  LEGACY_SCRIPTS_DIR="$CLAUDE_CONFIG_DIR_RESOLVED/hooks/scripts"
  if [ -d "$LEGACY_SCRIPTS_DIR" ]; then
    rm -f "$LEGACY_SCRIPTS_DIR"/*.js
    rmdir "$LEGACY_SCRIPTS_DIR" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} Removed legacy $LEGACY_SCRIPTS_DIR"
    REMOVED_HOOKS=true
  fi
  if [ "$REMOVED_HOOKS" = false ]; then
    echo -e "  ${CYAN}•${NC} No hook scripts found (already removed)"
  fi
elif [[ "$TOOL" == "codex" ]]; then
  echo ""
  echo -e "${BLUE}Removing Codex hooks...${NC}"
  remove_codex_hook_config

  echo ""
  echo -e "${BLUE}Removing Codex hook scripts...${NC}"
  remove_codex_hook_scripts
fi

# ============================================================
# OpenCode plugin cleanup (OpenCode only)
# ============================================================
if [[ "$TOOL" == "opencode" ]]; then
  OPENCODE_PLUGIN_LINK="$HOME/.config/opencode/plugins/act-hooks-plugin.js"

  echo ""
  echo -e "${BLUE}Removing OpenCode hooks plugin...${NC}"

  if [ -L "$OPENCODE_PLUGIN_LINK" ]; then
    link_target=$(readlink "$OPENCODE_PLUGIN_LINK")
    if [[ "$link_target" == "$TOOLKIT_PATH"* ]] || [[ "$link_target" == *"/hooks/opencode/act-hooks-plugin.js" ]]; then
      rm "$OPENCODE_PLUGIN_LINK"
      echo -e "  ${GREEN}✓${NC} Removed $OPENCODE_PLUGIN_LINK"
    else
      echo -e "  ${YELLOW}⚠${NC} Skipped non-toolkit plugin symlink: $OPENCODE_PLUGIN_LINK"
    fi
  elif [ -e "$OPENCODE_PLUGIN_LINK" ]; then
    echo -e "  ${YELLOW}⚠${NC} Skipped non-symlink plugin file: $OPENCODE_PLUGIN_LINK"
  else
    echo -e "  ${CYAN}•${NC} OpenCode plugin symlink not found (already removed)"
  fi
fi

# Shared config retention notice (Claude/OpenCode/Codex only)
echo ""
echo -e "${CYAN}•${NC} Left shared ACT config artifacts untouched under $HOME/.config/agentic-coding-toolkit"
