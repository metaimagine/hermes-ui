# Hermes UI Chat Parity Plan

> For Hermes: use subagent-driven-development for later execution passes if this grows beyond a single focused implementation cycle.

Goal: evolve the current management-first chat tab from a thin `hermes chat -q` wrapper into a browser surface that exposes the major Hermes CLI chat capabilities while preserving local-first operation.

Architecture: keep the browser UI local-first and API-backed. The UI should send a structured request to `/api/chat`, the server should translate that request into Hermes CLI flags, and the response should be normalized into transcript-friendly data plus raw command output for debugging. Chat transcript state can start client-side, with resume/continue hooks into real Hermes sessions.

Tech stack: Next.js App Router, React client component state, local API routes, Hermes CLI bridge in `src/lib/hermes/server.ts`.

---

## Capability audit

Current state:
- single textarea prompt
- POST to `/api/chat`
- server shells out to `hermes chat -q ... -Q --source tool`
- only raw stdout/stderr shown
- no transcript, no examples, no keyboard affordance, no session controls, no advanced flags

CLI chat capabilities to expose progressively:
- prompt/query
- image attachment path
- model override
- toolsets override
- skills preload
- provider selection
- verbose / quiet
- resume by session id
- continue by session name
- worktree toggle
- checkpoints toggle
- max-turns
- yolo
- pass-session-id
- source tag

Browser-first UX gaps from audit:
- no transcript/history
- empty state too weak
- command output disconnected from prompts
- chat page reads like a placeholder admin textarea
- no examples / no affordances / no advanced controls

---

## Phase 1: make the chat tab feel real

1. Add a transcript panel with user and assistant turns.
2. Parse normalized assistant text and session id from CLI output.
3. Keep raw stdout/stderr in a separate diagnostics panel.
4. Add example prompt chips.
5. Add keyboard affordance: Enter to send, Shift+Enter newline.
6. Add clear transcript action.

Verification:
- submit a prompt in browser
- see user bubble + assistant bubble + raw output card
- session id visible when returned
- build and lint pass

## Phase 2: expose major CLI flags

1. Expand `/api/chat` request schema to accept structured options.
2. Map browser options to Hermes CLI args safely.
3. Add advanced options section in the UI:
   - model
   - provider
   - toolsets
   - skills
   - image path
   - resume session id
   - continue session name
   - source
   - max turns
   - quiet / verbose
   - worktree / checkpoints / yolo / pass-session-id
4. Show active option pills above the transcript.

Verification:
- curl `/api/chat` with option combinations
- inspect returned args/session metadata
- browser options affect CLI invocation

## Phase 3: real session alignment

1. Pull recent Hermes sessions into the chat page.
2. Let user start from recent session / continue session from UI.
3. Support session rename/open from related pages.
4. Improve transcript persistence and loading states.

## Phase 4: richer operator chat UX

1. Stream incremental output if feasible.
2. Render code / lists / blocks better than raw `<pre>`.
3. Surface tool activity, approvals, and dangerous-command state inline.
4. Add image attach picker and validation for local paths.
5. Add share/export/copy transcript utilities.

## Phase 5: parity hardening loop

1. Run repeated browser dogfood passes after every feature slice.
2. Keep a parity checklist against `hermes chat --help`.
3. Close one gap per iteration until the browser surface covers the intended CLI subset.

## Immediate implementation slice

In this pass, implement:
- transcript panel
- normalized response parsing
- examples
- advanced CLI options form
- richer response payload from `/api/chat`
- verification via lint, build, curl, and browser smoke test
