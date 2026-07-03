# Skill names that were removed from `skills/`. Both `install.sh` and
# `uninstall.sh` source this file and use `REMOVED_ACT_SKILLS` to clean up
# stale symlinks in `~/.claude/skills/` and `~/.config/opencode/skills/` that
# still point into `$TOOLKIT_PATH/skills/`.
#
# **Append when removing a skill from `skills/`.** Entries may be pruned once
# enough time has passed that all users are expected to have upgraded past
# them.

REMOVED_ACT_SKILLS=(
  "act-meta-audit-work"
  "act-meta-compare-commands"
  "act-meta-compare-workflow-runs-branch"
  "act-meta-compare-workflow-runs-worktree"
  "act-meta-improve-command"
)
