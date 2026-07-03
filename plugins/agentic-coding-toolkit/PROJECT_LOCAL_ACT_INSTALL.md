# Project-local ACT install

This plugin copy was generated from `/Users/jholt/.agentic-coding-toolkit` at ACT version `1.0.0`.

Installed surfaces in this repository:

- `plugins/agentic-coding-toolkit/` contains the project-local ACT plugin runtime.
- `.agents/plugins/marketplace.json` exposes the plugin as a repo/team marketplace entry when present.
- `.agents/skills/act-*` links expose ACT skills through the universal per-project skill location.
- `.codex/agents/act-*.toml` exposes ACT custom agents to Codex without using `~/.codex/agents`.
- `.codex/hooks.json` wires ACT Codex hooks to this project-local plugin without using `~/.codex/hooks`.
- `.agents/act-settings.json` stores project-local ACT runtime settings.

Do not run `scripts/install.sh` or `scripts/uninstall.sh` from this plugin copy. Those upstream scripts are global installers and are intentionally guarded here.
