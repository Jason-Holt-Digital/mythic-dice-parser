#!/bin/bash

# Create symlinks for Claude Code, OpenCode, Cursor plugin, or Codex installs.

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
source "$SCRIPT_DIR/lib/install.sh"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib/install-codex.sh"

# ============================================================
# Parse arguments (all tools)
# ============================================================
TOOL=""
CONFIG_DIR=""
CONFIG_DIR_PROVIDED=false

usage() {
  echo "Usage: install.sh --tool [claude|opencode|cursor|codex] [--config-dir <path>]"
}

parse_tool_args "$@"
resolve_claude_config_dir

# ============================================================
# Configure target folders and labels (all tools)
# ============================================================
configure_tool

ACT_CONFIG_ROOT="$HOME/.config/agentic-coding-toolkit"
ACT_SHARED_BIN_DIR="$ACT_CONFIG_ROOT/bin"
# Shared runtime helpers installed for every supported tool. Each entry is the
# basename of a helper under scripts/lib that is copied into the shared bin dir.
ACT_SHARED_RUNTIME_HELPERS=(
  "act-run-script.js"
  "act-dart-migrate.js"
)
ACT_AGENT_TRANSFORM_SCRIPT="$TOOLKIT_PATH/scripts/lib/transform-agent.js"
ACT_SKILL_CODEX_TRANSFORM_SCRIPT="$TOOLKIT_PATH/scripts/lib/transform-skill-codex.js"
CURSOR_PLUGIN_MANIFEST="$TOOLKIT_PATH/.cursor-plugin/plugin.json"
CURSOR_LOCAL_PLUGIN_DIR="$HOME/.cursor/plugins/local"
CURSOR_PLUGIN_LINK="$CURSOR_LOCAL_PLUGIN_DIR/agentic-coding-toolkit"

# ============================================================
# Removed skill cleanup (Claude/OpenCode/Codex only)
# Silently clean up legacy ACT-owned skill symlinks for skills that have been
# removed from `skills/`. Runs before Node preflight so stale links get cleaned
# up even if later steps abort. Never prompts. Never fails parent.
# ============================================================
if [[ "$TOOL" != "cursor" ]]; then
  cleanup_removed_act_skill_symlinks "$(get_target_dir skills)" "" true
fi

# Node preflight (all tools)
# Node is required for settings bootstrap and install-time transforms.
if ! command -v node &>/dev/null; then
  echo -e "${RED}Error: Node.js is required but not found in PATH.${NC}"
  echo "Node is needed to register hooks in settings.json."
  echo "Install Node.js from https://nodejs.org/ and try again."
  exit 1
fi

# Bootstrap global ACT settings (all tools)
# Runs before install side effects so shared settings exist for every runtime.
if ! node "$TOOLKIT_PATH/scripts/lib/bootstrap-act-settings.js"; then
  exit 1
fi

# Shared runtime helpers install (all tools)
# All shared helpers go through one copy/chmod path so behavior stays
# consistent; copy or chmod failure is fatal so agents never get skills that
# reference a missing helper.
echo -e "${BLUE}Installing shared ACT runtime helpers...${NC}"
if ! mkdir -p "$ACT_SHARED_BIN_DIR"; then
  echo -e "  ${RED}✗${NC} Failed to create helper directory: $ACT_SHARED_BIN_DIR"
  exit 1
fi
for helper in "${ACT_SHARED_RUNTIME_HELPERS[@]}"; do
  helper_source="$TOOLKIT_PATH/scripts/lib/$helper"
  helper_target="$ACT_SHARED_BIN_DIR/$helper"
  if [ ! -f "$helper_source" ]; then
    echo -e "  ${RED}✗${NC} Missing helper source: $helper_source"
    exit 1
  fi
  if ! cp "$helper_source" "$helper_target"; then
    echo -e "  ${RED}✗${NC} Failed to install helper: $helper_target"
    exit 1
  fi
  if ! chmod 755 "$helper_target"; then
    echo -e "  ${RED}✗${NC} Failed to mark helper executable: $helper_target"
    exit 1
  fi
  echo -e "  ${GREEN}✓${NC} Installed $helper_target"
done

echo -e "${BLUE}Creating $TOOL_LABEL symlinks...${NC}"
echo ""

# Track totals
total_new=0
total_existing=0
total_replaced=0
total_agent_files=0
declare -a all_stale_links=()

# Cursor local plugin install (Cursor only)
# Cursor does not use command/agent/skill target folders here, so it exits after
# plugin symlink handling.
if [[ "$TOOL" == "cursor" ]]; then
  echo -e "${BLUE}Installing Cursor local plugin...${NC}"

  if [ ! -f "$CURSOR_PLUGIN_MANIFEST" ]; then
    echo -e "  ${RED}✗${NC} Missing Cursor plugin manifest: $CURSOR_PLUGIN_MANIFEST"
    exit 1
  fi

  if ! mkdir -p "$CURSOR_LOCAL_PLUGIN_DIR"; then
    echo -e "  ${RED}✗${NC} Failed to create directory: $CURSOR_LOCAL_PLUGIN_DIR"
    exit 1
  fi

  if [ -L "$CURSOR_PLUGIN_LINK" ]; then
    link_target=$(readlink "$CURSOR_PLUGIN_LINK")
    if resolved_target="$(resolve_symlink_dir_target "$CURSOR_PLUGIN_LINK")" && [ "$resolved_target" = "$TOOLKIT_PATH" ]; then
      echo -e "  ${GREEN}✓${NC} $CURSOR_PLUGIN_LINK ${CYAN}(already exists)${NC}"
      total_existing=$((total_existing + 1))
    else
      echo -e "  ${YELLOW}⚠${NC} $CURSOR_PLUGIN_LINK points to: $link_target"
      read -p "    Replace with this toolkit? [Y/n] " -n 1 -r
      echo ""
      if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
        rm "$CURSOR_PLUGIN_LINK"
        ln -s "$TOOLKIT_PATH" "$CURSOR_PLUGIN_LINK"
        echo -e "    ${GREEN}Replaced${NC}"
        total_replaced=$((total_replaced + 1))
      else
        echo -e "    ${CYAN}Kept existing${NC}"
      fi
    fi
  elif [ -e "$CURSOR_PLUGIN_LINK" ]; then
    echo -e "  ${YELLOW}⚠${NC} $CURSOR_PLUGIN_LINK exists and is not a symlink"
    read -p "    Replace with this toolkit? [Y/n] " -n 1 -r
    echo ""
    if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
      rm -rf "$CURSOR_PLUGIN_LINK"
      ln -s "$TOOLKIT_PATH" "$CURSOR_PLUGIN_LINK"
      echo -e "    ${GREEN}Replaced${NC}"
      total_replaced=$((total_replaced + 1))
    else
      echo -e "    ${CYAN}Kept existing${NC}"
    fi
  else
    ln -s "$TOOLKIT_PATH" "$CURSOR_PLUGIN_LINK"
    echo -e "  ${GREEN}✓${NC} $CURSOR_PLUGIN_LINK ${GREEN}(new)${NC}"
    total_new=$((total_new + 1))
  fi

  echo ""
  echo -e "${GREEN}✓ Install entries: $total_new new, $total_replaced replaced, $total_existing already existed${NC}"
  exit 0
fi

# ============================================================
# Process command/agent/skill folders (Claude/OpenCode/Codex only)
# Cursor exits earlier. Claude/OpenCode install commands, agents, and skills;
# Codex installs generated skills and custom-agent TOML files.
# ============================================================
for folder_type in "${FOLDER_TYPES[@]}"; do
  SOURCE_DIR="$TOOLKIT_PATH/$folder_type"
  TARGET_DIR="$(get_target_dir "$folder_type")"

  # Skip missing source folders for the current tool.
  if [ ! -d "$SOURCE_DIR" ]; then
    continue
  fi

  # Create the tool-specific target directory.
  if ! mkdir -p "$TARGET_DIR"; then
    echo -e "  ${RED}✗${NC} Failed to create directory: $TARGET_DIR"
    exit 1
  fi

  if [[ "$folder_type" == "commands" ]]; then
    # Commands are installed for Claude/OpenCode. Codex command-backed skills
    # are installed later as `act-help` and `act-update` skill entries.
    remove_legacy_command_symlink "$TARGET_DIR" total_replaced
    for command_file in "$SOURCE_DIR"/*.md; do
      if [ -f "$command_file" ]; then
        install_command_file "$command_file" "$TARGET_DIR"
      fi
    done

    if [ -d "$TARGET_DIR" ]; then
      for link in "$TARGET_DIR"/*; do
        if [ -L "$link" ] && [ ! -e "$link" ]; then
          all_stale_links+=("$link")
        fi
      done
    fi
    continue
  fi

  # Install agents or skills for each source subdirectory.
  for dir in "$SOURCE_DIR"/*/; do
    if [ -d "$dir" ]; then
      dirname=$(basename "$dir")
      target="$TARGET_DIR/$dirname"
      source_path="$(cd "$SOURCE_DIR/$dirname" && pwd -P)"

      if [[ "$folder_type" == "agents" ]]; then
        if [[ "$TOOL" == "codex" ]]; then
          install_codex_agents "$SOURCE_DIR/$dirname" "$TARGET_DIR"
          continue
        fi
        install_agent_folder "$SOURCE_DIR/$dirname" "$target" "$dirname" "$source_path"
        continue
      fi

      if [[ "$TOOL" == "codex" && "$folder_type" == "skills" ]]; then
        install_codex_skill_dir "$SOURCE_DIR/$dirname" "$target" "skills/$dirname/SKILL.md"
        continue
      fi

      if [ -L "$target" ]; then
        # Claude/OpenCode skill symlink exists: check expected toolkit target.
        link_target=$(readlink "$target")
        if resolved_target="$(resolve_symlink_dir_target "$target")" && [ "$resolved_target" = "$source_path" ]; then
          echo -e "  ${GREEN}✓${NC} $TARGET_DIR/$dirname ${CYAN}(already exists)${NC}"
          total_existing=$((total_existing + 1))
        else
          # Claude/OpenCode skill symlink points elsewhere: ask before replacing.
          echo -e "  ${YELLOW}⚠${NC} $TARGET_DIR/$dirname points to: $link_target"
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
      else
        # Claude/OpenCode skill symlink is missing: create it with an absolute path.
        ln -sf "$source_path" "$target"
        echo -e "  ${GREEN}✓${NC} $TARGET_DIR/$dirname ${GREEN}(new)${NC}"
        total_new=$((total_new + 1))
      fi
    fi
  done

  # Collect stale symlinks in this tool target folder (broken links only).
  if [ -d "$TARGET_DIR" ]; then
    for link in "$TARGET_DIR"/*; do
      if [ -L "$link" ] && [ ! -e "$link" ]; then
        all_stale_links+=("$link")
      fi
    done
  fi
done

# Codex command-backed skills (Codex only)
if [[ "$TOOL" == "codex" ]]; then
  install_codex_command_skill "act-help" "act-help.md"
  install_codex_command_skill "act-update" "act-update.md"
  echo -e "${CYAN}•${NC} Restart Codex if ACT skills do not appear or still show old content"
fi

# Install summary (Claude/OpenCode/Codex only)
echo ""
echo -e "${GREEN}✓ Install entries: $total_new new, $total_replaced replaced, $total_existing already existed${NC}"
if [ "$total_agent_files" -gt 0 ]; then
  echo -e "${GREEN}✓ Generated $total_agent_files agent file(s)${NC}"
fi

# ============================================================
# Hook integration (Claude/OpenCode/Codex only)
# ============================================================
if [[ "$TOOL" == "claude" ]]; then
  # Claude only: copy shared hook core and Claude adapters preserving directory structure.
  HOOK_CORE_SRC="$TOOLKIT_PATH/hooks/core"
  CLAUDE_HOOKS_SRC="$TOOLKIT_PATH/hooks/claude"
  HOOK_CORE_DST="$CLAUDE_CONFIG_DIR_RESOLVED/hooks/core"
  HOOK_CLAUDE_DST="$CLAUDE_CONFIG_DIR_RESOLVED/hooks/claude"
  if [ -d "$HOOK_CORE_SRC" ] || [ -d "$CLAUDE_HOOKS_SRC" ]; then
    echo ""
    echo -e "${BLUE}Installing hook scripts...${NC}"
    mkdir -p "$HOOK_CORE_DST"
    mkdir -p "$HOOK_CLAUDE_DST"

    for file in "$HOOK_CORE_SRC"/*.js; do
      if [ -f "$file" ]; then
        cp "$file" "$HOOK_CORE_DST/"
      fi
    done

    for file in "$CLAUDE_HOOKS_SRC"/*.js; do
      if [ -f "$file" ]; then
        cp "$file" "$HOOK_CLAUDE_DST/"
      fi
    done

    # Claude only: clean up legacy flat hooks/scripts directory if present.
    LEGACY_SCRIPTS_DIR="$CLAUDE_CONFIG_DIR_RESOLVED/hooks/scripts"
    if [ -d "$LEGACY_SCRIPTS_DIR" ]; then
      rm -f "$LEGACY_SCRIPTS_DIR"/*.js
      rmdir "$LEGACY_SCRIPTS_DIR" 2>/dev/null
      echo -e "  ${GREEN}✓${NC} Removed legacy $LEGACY_SCRIPTS_DIR"
    fi

    echo -e "  ${GREEN}✓${NC} Copied hook scripts to $HOOK_CORE_DST and $HOOK_CLAUDE_DST"
  fi

  # Claude only: install hooks into the resolved Claude settings.json.
  HOOKS_FILE="$TOOLKIT_PATH/hooks/hooks.json"
  if [ -f "$HOOKS_FILE" ]; then
    echo ""
    echo -e "${BLUE}Installing hooks...${NC}"
    node "$TOOLKIT_PATH/scripts/lib/install-hooks.js" --settings "$CLAUDE_CONFIG_DIR_RESOLVED/settings.json" --hook-dir "$HOOK_CLAUDE_DST" "$HOOKS_FILE"
  fi
elif [[ "$TOOL" == "opencode" ]]; then
  OPENCODE_PLUGIN_SOURCE="$TOOLKIT_PATH/hooks/opencode/act-hooks-plugin.js"
  OPENCODE_PLUGIN_DIR="$HOME/.config/opencode/plugins"
  OPENCODE_PLUGIN_LINK="$OPENCODE_PLUGIN_DIR/act-hooks-plugin.js"

  echo ""
  echo -e "${BLUE}Installing OpenCode hooks plugin...${NC}"

  if [ ! -f "$OPENCODE_PLUGIN_SOURCE" ]; then
    echo -e "  ${RED}✗${NC} Missing plugin source: $OPENCODE_PLUGIN_SOURCE"
    exit 1
  fi

  if ! mkdir -p "$OPENCODE_PLUGIN_DIR"; then
    echo -e "  ${RED}✗${NC} Failed to create directory: $OPENCODE_PLUGIN_DIR"
    exit 1
  fi

  if [ -L "$OPENCODE_PLUGIN_LINK" ]; then
    current_target=$(readlink "$OPENCODE_PLUGIN_LINK")
    if [ "$current_target" = "$OPENCODE_PLUGIN_SOURCE" ]; then
      echo -e "  ${GREEN}✓${NC} $OPENCODE_PLUGIN_LINK ${CYAN}(already exists)${NC}"
    else
      if ln -sfn "$OPENCODE_PLUGIN_SOURCE" "$OPENCODE_PLUGIN_LINK"; then
        echo -e "  ${GREEN}✓${NC} Relinked stale plugin symlink"
      else
        echo -e "  ${RED}✗${NC} Failed to relink plugin symlink: $OPENCODE_PLUGIN_LINK"
        exit 1
      fi
    fi
  elif [ -e "$OPENCODE_PLUGIN_LINK" ]; then
    echo -e "  ${YELLOW}⚠${NC} $OPENCODE_PLUGIN_LINK exists and is not a symlink"
    echo -e "    ${YELLOW}Skipped${NC} OpenCode hook symlink step. Remove or rename this file and rerun install."
  else
    if ln -s "$OPENCODE_PLUGIN_SOURCE" "$OPENCODE_PLUGIN_LINK"; then
      echo -e "  ${GREEN}✓${NC} Installed $OPENCODE_PLUGIN_LINK"
    else
      echo -e "  ${RED}✗${NC} Failed to create plugin symlink: $OPENCODE_PLUGIN_LINK"
      exit 1
    fi
  fi
elif [[ "$TOOL" == "codex" ]]; then
  echo ""
  echo -e "${BLUE}Installing Codex hook scripts...${NC}"
  install_codex_hook_scripts

  echo ""
  echo -e "${BLUE}Installing Codex hooks...${NC}"
  install_codex_hook_config
fi

# Stale symlink cleanup prompt (Claude/OpenCode/Codex only)
if [ ${#all_stale_links[@]} -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}Found ${#all_stale_links[@]} stale symlink(s):${NC}"

  for stale in "${all_stale_links[@]}"; do
    echo ""
    echo -e "  ${RED}✗${NC} $stale ${RED}(no longer valid)${NC}"
    read -p "    Delete this symlink? [Y/n] " -n 1 -r
    echo ""
    if [[ -z "$REPLY" || $REPLY =~ ^[Yy]$ ]]; then
      rm "$stale"
      echo -e "    ${GREEN}Deleted${NC}"
    else
      echo -e "    ${CYAN}Kept${NC}"
    fi
  done
fi
