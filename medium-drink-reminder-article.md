# Medium Article Draft: Building a Telegram Health Reminder System with Google Apps Script

## Title Options

1. I Rebuilt My Health Reminders with Telegram, Google Apps Script, and Google Sheets
2. From Missed Water Breaks to a Cloud Reminder Agent: A Practical Apps Script Build
3. How I Built a Personal Health Tracking Bot with Telegram and Google Sheets
4. The Small Automation That Taught Me Better AI Agent Design
5. Building a Drink Reminder System That Works Even When My Laptop Is Off
6. A Senior Engineer's Approach to Personal Health Automation
7. Turning Telegram into a Lightweight Health Tracking Interface

## Article

Most personal automation projects start with a tiny annoyance.

Mine was water.

I did not need a complex wellness platform. I needed a system that could remind me to drink water throughout the day, remind me to take Vitamin C, capture blood pressure and weight at night, and summarize the week in a format that could be analyzed by ChatGPT. It needed to work on Android. It needed to run while my computer was off. It needed to avoid nagging me after I had already completed a task. And because I think like a senior software engineer, I wanted the system to be observable, reproducible, and safe against duplicate button taps.

That sounds larger than a drink reminder app, but that was the point. The project became a compact exercise in the same design habits I use when building AI systems and agent workflows: define the loop, make state explicit, decide when automation should stop, and keep a human-readable audit trail.

### The Problem: Scheduled Tasks Were Not Enough

I first considered using scheduled tasks inside ChatGPT. That works well for a few reminders, but this workflow had more moving parts than a small task limit could comfortably handle.

The water schedule alone has 10 daily reminders:

07:40, 08:45, 10:00, 11:00, 14:00, 15:15, 16:30, 17:45, 20:30, and 21:45.

Each water reminder represents 250 cc, which gives a daily target of 2500 cc across 10 cups.

On top of that, I wanted a 15:00 Vitamin C reminder, a 17:00 Vitamin C backup only if Vitamin C was not already logged, a 20:00 blood pressure and weight reminder, and a 21:30 backup only if the blood pressure and weight record was incomplete.

A simple reminder tool can send notifications. A useful automation system also knows when not to send them.

That distinction shaped the architecture.

### The Architecture: Simple Cloud Components

The final stack is intentionally ordinary:

- Google Apps Script for scheduled execution and webhook handling
- Telegram Bot API for Android-friendly reminders and inline buttons
- Google Sheets as the structured daily log
- Apps Script Script Properties for secrets and configuration
- Optional OpenAI Responses API for weekly analysis

Google Apps Script runs a time trigger every minute. The main function, `checkReminders`, checks the current time in the `Asia/Taipei` timezone. A reminder is considered due when the current time is at or after the target time and less than three minutes late. This small due window makes the system tolerant of trigger timing without repeatedly sending the same notification.

Every reminder that has been sent is marked in Script Properties using keys like `sent:YYYY-MM-DD:water_15:15`, `sent:YYYY-MM-DD:vitamin_main`, or `sent:YYYY-MM-DD:bp_weight_backup`. Those keys are not a full checklist. They only represent reminders that have already occurred that day. If it is noon, it is normal to see fewer than 10 water `sent:*` properties.

The user interaction happens in Telegram. Water and Vitamin C use inline buttons. Blood pressure and weight use a text message such as:

`BP 120/80 weight 70`

The parser also supports localized keyword alternatives through the source regex patterns for `\u8840\u58d3` or `bp`, and `\u9ad4\u91cd` or `weight`. For public setup and testing, the English format is simpler and less ambiguous.

### Designing the Sheet Like a Small Database

The Google Sheet has one tab named `Log`.

Each row represents one calendar day, keyed by `date` in `yyyy-MM-dd` format. The columns are:

`date`, `water_ml`, `water_cups`, `vitamin_c`, `vitamin_time`, `bp_sys`, `bp_dia`, `weight_kg`, `bp_weight_time`, `last_water_time`, `water_0740`, `water_0845`, `water_1000`, `water_1100`, `water_1400`, `water_1515`, `water_1630`, `water_1745`, `water_2030`, `water_2145`, `notes`, and `updated_at`.

The script creates the row for the day when needed. It also writes the formulas instead of asking the user to maintain them manually:

- `water_ml = water_cups * 250`
- `water_cups = COUNTIF(water slots, TRUE)`

In the current layout, that means `water_ml` uses `=C<row>*250`, and `water_cups` uses `=COUNTIF(K<row>:T<row>,TRUE)`.

The one-row-per-day design is not fancy, but it is useful. It makes the daily state obvious. Water completion is a set of booleans. Vitamin C is a boolean. Blood pressure and weight are fixed columns. Weekly reporting becomes easy because the script can scan the last seven calendar days and build a deterministic summary.

### The Telegram Workflow

At each water reminder time, Telegram sends:

`Water reminder <time>`

`Please drink 250 cc.`

The inline button says `Done 250cc`, and the callback data is `water:<index>`. When the button is tapped, the script marks the matching water slot as `TRUE`, updates `last_water_time`, updates `updated_at`, answers the Telegram callback popup, and sends a normal chat confirmation such as:

`Logged: 15:15 water 250 cc.`

The important part is what happens when the same old button is tapped again. Telegram callbacks can be retried. Humans also tap old buttons. The script checks whether that water cell is already `TRUE`. If it is, the water count is not increased again. The callback popup says the water was already logged, and the chat receives:

`Already logged: 15:15 water 250 cc.`

Vitamin C works the same way. The 15:00 reminder says:

`15:00 Vitamin C reminder.`

`Tap the button after taking it.`

The button says `Vitamin C done`, and the script supports callback data values `vitamin:done`, `vitamin_done`, and `vitamin`. On first tap, it sets `vitamin_c` to `TRUE`, writes `vitamin_time`, updates `updated_at`, and replies:

`Logged: Vitamin C done. The 17:00 backup reminder will be skipped.`

If it was already logged, the bot sends:

`Already logged: Vitamin C done. The 17:00 backup reminder will be skipped.`

This chat message matters. In an earlier version, the already-logged state was only visible as a Telegram callback popup. That was easy to miss. The fix was simple but important: callback popups are not enough for state-changing workflows. Send a normal chat confirmation for clarity.

For blood pressure and weight, the 20:00 reminder says:

`20:00 Blood pressure and weight reminder.`

`Reply like: BP 128/82 weight 72.4`

There is also a `Log later` button with callback data `bp:later`. It does not log anything; it only acknowledges the tap with:

`OK. I will remind again at 21:30 if BP and weight are not logged.`

The actual data entry is text. If the parser succeeds, the script writes `bp_sys`, `bp_dia`, `weight_kg`, `bp_weight_time`, and `updated_at`, then replies:

`Logged: BP 120/80, weight 70 kg. The 21:30 backup reminder will be skipped.`

If parsing fails, the bot echoes the input and tells the user to use `BP 120/80 weight 70`.

### Webhook Safety and Deployment Pitfalls

Telegram sends messages and button callbacks to an Apps Script Web App. The webhook accepts only `message` and `callback_query` updates. It can include a `WEBHOOK_SECRET` query parameter, and `doPost` returns `forbidden` when the configured secret exists and the incoming secret does not match.

The webhook also uses Apps Script CacheService to prevent duplicate Telegram update handling. It stores `update:<update_id>` for 21600 seconds, which is six hours. If Telegram retries the same update, the script returns `ok` without processing it twice.

One of the easiest mistakes in Apps Script is assuming that saving `Code.gs` updates the live webhook. It does not. The deployed Web App keeps running the old version until a new deployment version is created.

The safe deployment flow is:

1. Save `Code.gs`.
2. Open `Deploy`.
3. Open `Manage deployments`.
4. Edit the active Web App deployment.
5. Select `New version`.
6. Add a clear deployment description.
7. Deploy.

I started using descriptions like `v4 add duplicate callback protection`, `v5 add weekly report`, and `v9 chat-confirm already logged callbacks`. That small habit makes later debugging much easier.

### The Weekly Report and Optional AI Path

Every Thursday night around 23:50, the script sends a weekly report.

It covers the current day plus the previous six days. It lists daily rows with water in ml, water cups out of 10, Vitamin C yes/no, blood pressure or missing, and weight or missing. Then it summarizes average water, how many days met the 2500 ml target, how many days completed Vitamin C, how many days completed BP plus weight, average BP when available, and average weight when available.

The report ends with an instruction to analyze trends, adherence, missing data, and practical next-week suggestions. It explicitly says not to diagnose and to suggest consulting a clinician if readings are concerning.

If `OPENAI_API_KEY` is not configured, the raw weekly report is sent to Telegram with instructions to paste it into ChatGPT. If the key is configured, Apps Script calls `https://api.openai.com/v1/responses` with `OPENAI_MODEL` or the default `gpt-5.2-mini`, `max_output_tokens` set to 1200, and a prompt asking for concise, non-diagnostic feedback in Traditional Chinese.

If the API call fails, the bot sends an error wrapper with the HTTP status and the raw report. If OpenAI returns no text, the bot sends a fallback message and the report. Long Telegram messages are split into 3500-character chunks.

### Lessons for AI Agent Builders

This was not only a health reminder. It was a miniature agentic system.

It has a schedule. It observes state. It decides whether to act. It handles user input. It writes durable records. It summarizes history. It optionally asks an AI model for interpretation. It also has boundaries: the AI output is non-diagnostic, the raw data remains visible, and sensitive values live in Script Properties instead of public docs or Sheets.

The biggest lesson is that automation quality often comes from small reliability details:

- Make duplicate actions harmless.
- Send visible confirmations after state changes.
- Keep secrets out of public artifacts.
- Treat deployment state as separate from source state.
- Build deterministic summaries before asking an AI model to reason.
- Skip backup reminders based on actual recorded data, not assumptions.

Those details are also what consultants need when turning prototypes into client-ready workflows. The value is not only the script. The value is the operating model: clear inputs, explicit state, predictable actions, and a human-readable trail.

### Conclusion

The final system is small enough to understand in one sitting, but complete enough to run every day.

Google Apps Script handles the scheduler and webhook. Telegram provides the phone interface. Google Sheets stores the record. OpenAI is optional, not required. The reminder logic is specific: 10 water reminders of 250 cc, Vitamin C at 15:00 with a 17:00 backup, BP and weight at 20:00 with a 21:30 backup, and a Thursday 23:50 weekly summary.

For me, the most satisfying part is that the system knows when to stay quiet. If Vitamin C is already logged, no 17:00 backup. If blood pressure and weight are complete, no 21:30 backup. If an old water button is tapped again, no duplicate water count.

That is the difference between a notification script and a useful automation.

## SEO Description

A practical walkthrough of building a cloud-based health reminder system with Telegram Bot API, Google Apps Script, Google Sheets, and optional OpenAI weekly analysis. The project covers water reminders, Vitamin C tracking, blood pressure and weight logging, webhook callbacks, duplicate protection, backup reminder logic, and AI-ready weekly summaries.

## SEO Keywords

Google Apps Script automation, Telegram bot health tracker, Google Sheets health log, drink reminder app, personal automation, OpenAI weekly summary, AI agent workflow, webhook automation, Android reminders, senior software engineer project

## Tags

Google Apps Script, Telegram Bot, Google Sheets, Automation, OpenAI, AI Agents, Health Tracking, Personal Productivity, Webhooks, Software Engineering
