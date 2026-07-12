# Drink Reminder Content Pack

## Resume STAR Bullets

- Built a cloud-based personal health reminder system with Google Apps Script, Telegram Bot API, and Google Sheets after outgrowing simple scheduled reminders; shipped 10 daily 250 cc water reminders, a 2500 cc daily target, Vitamin C tracking, BP/weight logging, backup-skip logic, and Thursday night weekly summaries.
- Designed the Apps Script reminder engine around explicit state and idempotency; used one-minute `checkReminders` triggers, three-minute due windows, `sent:YYYY-MM-DD:<key>` Script Properties, and CacheService duplicate update protection for 21600 seconds to prevent repeated Telegram sends and duplicate callback writes.
- Implemented Telegram-based mobile UX for Android; added `Done 250cc`, `Vitamin C done`, and `Log later` inline buttons, chat confirmations for successful and already-logged callbacks, and text parsing for `BP 120/80 weight 70` plus localized keyword alternatives.
- Modeled Google Sheets as a lightweight operational database with one `Log` row per `Asia/Taipei` calendar day; captured `date`, water formulas, 10 water booleans, Vitamin C state/time, systolic/diastolic BP, weight, last water time, notes, and update timestamps.
- Added weekly AI-ready reporting; generated seven-day summaries with water averages, target completion, Vitamin C adherence, BP+weight completion, average BP, average weight, missing-data notes, non-diagnostic guidance, and optional OpenAI Responses API analysis using `OPENAI_API_KEY`, `OPENAI_MODEL`, and a default `gpt-5.2-mini` model.
- Hardened setup and operations for public reuse; documented BotFather setup, Telegram `getUpdates`, Apps Script Web App deployment, `WEBHOOK_SECRET`, `WEB_APP_URL`, webhook setup, trigger creation, deployment versioning, security placeholders, and troubleshooting paths.

## LinkedIn Post (~300 words)

I built a small personal automation that turned into a useful reminder of how good AI-agent work should be designed.

The problem was ordinary: I wanted reliable health reminders on Android without keeping my computer on. The workflow needed 10 water reminders per day, each for 250 cc, for a 2500 cc target. It also needed Vitamin C at 15:00, a 17:00 backup only if Vitamin C was not logged, blood pressure and weight at 20:00, and a 21:30 backup only if `bp_sys`, `bp_dia`, and `weight_kg` were incomplete.

The final stack is lightweight: Google Apps Script, Telegram Bot API, Google Sheets, and optional OpenAI analysis.

Apps Script runs a one-minute reminder checker in the `Asia/Taipei` timezone. Telegram handles inline buttons like `Done 250cc`, `Vitamin C done`, and `Log later`. Google Sheets stores one `Log` row per day with water slot booleans, Vitamin C state, BP, weight, timestamps, notes, and formulas for `water_ml` and `water_cups`.

The important engineering work was not sending messages. It was state management.

Old Telegram buttons are safe to tap because the script checks whether a water slot or Vitamin C is already logged before writing. Telegram update retries are handled with CacheService for six hours. Reminder sends are tracked with `sent:YYYY-MM-DD:<key>` Script Properties. Weekly summaries run Thursday night, include seven days of adherence and trend data, and can either be pasted into ChatGPT or analyzed automatically through the OpenAI Responses API.

This is the same pattern I care about in AI agent consulting: define the operating loop, keep state explicit, make actions idempotent, protect secrets, and produce human-readable evidence.

Small project. Real production instincts.

## Commit Message

```text
docs: expand public drink reminder project materials

Rewrite README as a full engineer guide covering architecture, setup, sheet schema, Telegram behavior, skip-backup logic, weekly reporting, optional OpenAI analysis, deployment rules, troubleshooting, and future improvements.

Add a Medium article draft and consultant-oriented content pack with resume bullets, LinkedIn copy, PR text, and AI agent extension ideas.
```

## Pull Request Description

### Summary

This PR rewrites and expands the public-facing content for the Drink Reminder Health Tracking System.

### What Changed

- Rebuilt `README.md` as a full engineer README with:
  - overview and motivation
  - feature list
  - tech stack
  - Mermaid architecture
  - folder structure
  - installation flow
  - Google Sheet schema
  - Telegram setup
  - Apps Script Script Properties
  - webhook setup
  - trigger setup
  - water, Vitamin C, BP, weight, and weekly-report usage
  - Apps Script behavior notes
  - troubleshooting
  - deployment rules
  - security checklist
  - verification checklist
  - lessons learned
  - future improvements
- Added `medium-drink-reminder-article.md` as a story-driven Medium draft with title options, build journey, architecture, pitfalls, lessons, SEO description, keywords, and tags.
- Added `docs/content-pack.md` with resume STAR bullets, a LinkedIn post, a commit message, this PR description, and future AI Agent Consultant extensions.

### Technical Details Preserved

- 10 daily water reminders at `07:40`, `08:45`, `10:00`, `11:00`, `14:00`, `15:15`, `16:30`, `17:45`, `20:30`, and `21:45`.
- `250 cc` per water reminder and `2500 cc` daily target.
- Vitamin C reminder at `15:00` and backup at `17:00`.
- Blood pressure and weight reminder at `20:00` and backup at `21:30`.
- Backup skip conditions for `vitamin_c`, `bp_sys`, `bp_dia`, and `weight_kg`.
- Telegram buttons: `Done 250cc`, `Vitamin C done`, and `Log later`.
- Callback data: `water:<index>`, `vitamin:done`, `vitamin_done`, `vitamin`, and `bp:later`.
- Google Sheet tab name `Log`, full header schema, and one-row-per-day model.
- Apps Script formulas `=C<row>*250` and `=COUNTIF(K<row>:T<row>,TRUE)`.
- Apps Script timezone `Asia/Taipei`.
- One-minute `checkReminders` trigger and Thursday `23:50` weekly summary.
- Three-minute reminder due window.
- `sent:YYYY-MM-DD:<key>` skip logic.
- Telegram webhook handling for `message` and `callback_query`.
- `WEBHOOK_SECRET` handling.
- CacheService duplicate protection for `update_id` for `21600` seconds.
- OpenAI optional path with `OPENAI_API_KEY`, `OPENAI_MODEL`, default `gpt-5.2-mini`, Responses API endpoint, `max_output_tokens: 1200`, and Traditional Chinese non-diagnostic summary behavior.
- Telegram chunking at `3500` characters.
- Apps Script deployment-version rule and troubleshooting details.

### Testing

- Documentation-only change.
- Verified content against `README.md`, `SETUP.md`, `docs/google-sheet-schema.md`, and `apps-script/Code.gs`.

## Future Extensions Toward AI Agent Consultant Positioning

### Productized Automation Template

Turn the project into a reusable client template for personal or team reminder workflows:

- configurable schedules instead of hard-coded reminder times
- setup validator for sheet headers, Script Properties, triggers, and webhook status
- reusable Telegram interaction patterns for buttons, callbacks, text parsing, and duplicate protection
- client-facing setup checklist and handoff guide

### AI Agent Health Summary Assistant

Extend the weekly report into a constrained AI agent:

- summarize adherence and missing data
- ask follow-up questions when key values are missing
- produce next-week action suggestions without medical diagnosis
- preserve raw data beside the AI-generated interpretation
- flag when readings may warrant clinician review

### Consultant Dashboard Workflow

Add an operator dashboard for automation consulting engagements:

- show daily completion state
- expose `/today` and `/week` Telegram commands
- include webhook health checks and trigger status
- report last successful reminder send, last callback, and last weekly summary
- generate client-ready weekly PDF or Google Doc reports

### Multi-Client Agent Architecture

Generalize the system for more than one user while preserving privacy:

- one spreadsheet per client or one partitioned workbook
- per-client Telegram chat IDs and webhook secrets
- per-client reminder schedules and health fields
- clear separation between configuration, state, and generated analysis

### Reliability and Governance

Move the project closer to consultant-grade delivery:

- add automated configuration validation
- add error classification for Telegram, Sheets, webhook, and OpenAI failures
- add secret rotation instructions
- add audit logs for state-changing callbacks
- add deployment runbooks and rollback instructions
- document non-diagnostic AI boundaries clearly for health-related use cases

### Portfolio Positioning

Use this project to demonstrate:

- senior SWE judgment in a small but complete system
- AI engineering discipline around deterministic inputs before model calls
- AI agent design patterns: schedule, observe, decide, act, record, summarize
- consultant thinking: setup docs, troubleshooting, security, handoff, and future extensibility
