# hermes-ui

Independent management-first web UI for Hermes Agent.

This project is intentionally separate from the official Hermes repository. It is designed as a local operator cockpit first, with chat as a secondary surface.

Current goals:
- management-first dashboard
- structured config editing instead of raw YAML by default
- session browsing and inspection
- memory / skills / cron / approvals visibility
- bilingual UI (中文 / English)
- dark / light themes

## Status

Work in progress, but already functional.

Implemented pages:
- Dashboard
- Config
- Sessions
- Memory
- Skills
- Cron
- Approvals
- Chat

## Tech stack

- Next.js
- React
- TypeScript
- react-hook-form

## Local development

```bash
cd ~/Projects/hermes-ui
npm install
npm run dev -- --hostname 127.0.0.1 --port 3007
```

Open:
- http://127.0.0.1:3007/dashboard
- http://127.0.0.1:3007/config
- http://127.0.0.1:3007/sessions

## Data sources

This UI reads from your local Hermes installation and local Hermes CLI.

Examples:
- `~/.hermes/config.yaml`
- `~/.hermes/sessions/sessions.json`
- `~/.hermes/memories/USER.md`
- `~/.hermes/pairing/*.json`
- `~/.hermes/skills/`
- `hermes cron status`
- `hermes cron list`
- `hermes chat -q ...`

## Product direction

This project currently follows these principles:
- operator console first
- safer structured config editing first
- raw YAML only as an advanced path
- local-first, no-auth default
- real browser-based UI/UX audit loop before publishing

## Known limitations

- Config editing only covers the most common fields in structured form today.
- Advanced YAML is still needed for unsupported settings.
- Sessions page is still early and needs richer triage actions.
- Cron and approvals pages are visibility-first, not full workflow consoles yet.
- No authentication layer yet; local-only usage is assumed.

## Near-term roadmap

- stronger field validation and save feedback in Config
- richer triage actions in Sessions
- better anomaly explanation and operational severity modeling
- more complete operator workflows for Cron / Approvals / Memory
- GitHub release once UI passes repeated audit loops
