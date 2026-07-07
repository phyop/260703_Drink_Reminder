# Drink Reminder System

This repository documents a reproducible personal drink reminder and logging workflow built with Telegram Bot, Google Apps Script, and Google Sheets.

The goal is not to publish private health data. The goal is to show how a small automation system can make a daily habit visible, repeatable, and easy to review.

## Problem

Daily hydration sounds simple, but it is easy to lose track of it during work.

The system I wanted was small:

- send reminders at planned times
- let me log water intake quickly from my phone
- store records in a structured table
- review daily progress later
- avoid building a full mobile app or backend server

The engineering question became:

> How can a lightweight personal automation system turn a scattered daily habit into structured data?

## System Overview

```text
Telegram Bot
     |
     | message or command
     v
Google Apps Script Web App
     |
     | append row
     v
Google Sheets
     |
     | daily review
     v
Habit feedback loop
```

## What This Version Includes

- A public README with the full setup flow
- A sanitized Google Apps Script template
- A Google Sheet schema
- Common bugs and fixes
- Privacy notes for publishing the project safely

This public repository intentionally does not include my original personal health log.

## Folder Structure

```text
260703_Drink Reminder/
├── README.md
├── .gitignore
├── apps-script/
│   └── Code.gs
└── docs/
    └── google-sheet-schema.md
```

## Step 1: Create A Telegram Bot

Open Telegram and search for:

```text
@BotFather
```

Create a bot:

```text
/newbot
```

BotFather will ask for:

- bot display name
- bot username, which must end with `bot`

After creation, BotFather gives you a token like:

```text
123456789:AAExampleTokenDoNotCommitThis
```

Do not put the real token in GitHub.

## Step 2: Create A Google Sheet

Create a Google Sheet with two tabs:

```text
Logs
Config
```

The `Logs` sheet should use these columns:

```text
Timestamp | Date | Time | Chat ID | Type | Amount | Unit | Raw Text | Note
```

The `Config` sheet is optional for the first version, but useful later for reminder times or default settings.

More detail is documented in:

- [docs/google-sheet-schema.md](docs/google-sheet-schema.md)

## Step 3: Create A Google Apps Script Project

In the Google Sheet:

```text
Extensions -> Apps Script
```

Create a script file named:

```text
Code.gs
```

Copy the sanitized template from:

- [apps-script/Code.gs](apps-script/Code.gs)

## Step 4: Set Script Properties

In Apps Script:

```text
Project Settings -> Script Properties
```

Add:

```text
BOT_TOKEN = your Telegram bot token
SHEET_ID  = your Google Sheet ID
```

The Sheet ID is the long value in the Google Sheet URL:

```text
https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit
```

Do not hard-code these values in `Code.gs`.

## Step 5: Deploy As Web App

In Apps Script:

```text
Deploy -> New deployment -> Web app
```

Use:

```text
Execute as: Me
Who has access: Anyone
```

After deployment, copy the Web App URL. It usually ends with:

```text
/exec
```

## Step 6: Connect Telegram To Apps Script

Telegram sends bot messages to your Apps Script through a webhook.

In Apps Script, run:

```javascript
setWebhook("YOUR_WEB_APP_EXEC_URL");
```

You can also set the webhook from a browser after replacing the values:

```text
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<YOUR_WEB_APP_EXEC_URL>
```

If it works, Telegram returns:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Step 7: Start The Bot

Open your Telegram bot and send:

```text
/start
```

The script stores your chat ID in Script Properties as:

```text
DEFAULT_CHAT_ID
```

This allows scheduled reminders to send messages back to you later.

## Step 8: Log Water Intake

Send a simple message to the bot:

```text
water 250
```

or:

```text
250
```

The script appends a row to `Logs`:

```text
Timestamp | Date | Time | Chat ID | Type | Amount | Unit | Raw Text | Note
```

For example:

```text
2026-07-07 09:30:00 | 2026-07-07 | 09:30:00 | 123456789 | water | 250 | cc | water 250 |
```

## Step 9: Add Reminders

In Apps Script, open:

```text
Triggers -> Add Trigger
```

Create a time-driven trigger for:

```javascript
sendDrinkReminder
```

Example reminder times:

- morning
- before lunch
- afternoon
- evening

The first version can use several time-driven triggers instead of a complex scheduler.

## Common Bugs And Fixes

### Bug 1: Telegram Webhook Returns `ok: false`

Possible causes:

- wrong bot token
- wrong Web App URL
- using `/dev` URL instead of `/exec`
- Apps Script deployment permission is too restricted

Fix:

- redeploy as Web App
- use `Execute as: Me`
- use `Who has access: Anyone`
- use the `/exec` URL
- run `setWebhook()` again

### Bug 2: Visiting The Web App URL Shows An Error

This is normal if you open the URL directly in a browser.

Telegram sends a `POST` request to `doPost(e)`. A browser visit is usually a `GET` request.

Fix:

- test with Telegram messages
- keep `doGet()` only as a simple health check

### Bug 3: Messages Arrive But Nothing Is Written To Sheet

Possible causes:

- wrong `SHEET_ID`
- missing `Logs` tab
- script has not been authorized
- `appendRow()` is writing to another spreadsheet

Fix:

- confirm the Sheet ID
- run `setupSheets()` manually once
- approve Apps Script permissions
- send another Telegram message

### Bug 4: Reminder Does Not Send

Possible causes:

- `DEFAULT_CHAT_ID` is not set
- `/start` was never sent to the bot
- trigger is not installed
- bot token is wrong

Fix:

- send `/start` to the bot
- check Script Properties for `DEFAULT_CHAT_ID`
- run `sendDrinkReminder()` manually
- add a time-driven trigger

### Bug 5: Old Code Still Runs After Editing Apps Script

Apps Script deployments can keep serving an older version.

Fix:

- open `Deploy -> Manage deployments`
- edit the existing deployment
- select a new version
- redeploy
- test again from Telegram

### Bug 6: Time Looks Wrong In Google Sheets

Possible causes:

- Apps Script timezone is different
- Google Sheet timezone is different
- display formatting is inconsistent

Fix:

- set Apps Script timezone in Project Settings
- set Google Sheet timezone in File settings
- use separate `Date` and `Time` columns

### Bug 7: Sensitive Data Accidentally Gets Committed

Possible causes:

- raw notes are not ignored
- token is hard-coded
- exported logs are added to Git

Fix:

- keep secrets in Script Properties
- keep private notes in `.gitignore`
- run `git status` before every commit
- never commit Telegram tokens or personal health logs

## Minimal Test Plan

After setup, test in this order:

1. Run `setupSheets()` in Apps Script.
2. Deploy the Web App.
3. Run `setWebhook("YOUR_WEB_APP_EXEC_URL")`.
4. Send `/start` to the Telegram bot.
5. Confirm `DEFAULT_CHAT_ID` exists in Script Properties.
6. Send `water 250`.
7. Confirm a row appears in `Logs`.
8. Run `sendDrinkReminder()` manually.
9. Confirm a Telegram reminder arrives.
10. Add time-driven triggers.

## Privacy Notes

This public repository intentionally does not include:

- personal health measurements
- private medical notes
- full daily logs
- account identifiers
- Telegram tokens
- Google Sheet IDs
- private screenshots
- raw conversation exports

The original local note is kept out of Git tracking because it contains sensitive health-related context and currently appears to have an encoding issue.

## Project Status

This is the first reproducible public version of the Drink Reminder project.

Future work can include:

- sanitized screenshots
- a Medium article version
- richer reminder scheduling
- daily summary messages
- chart examples in Google Sheets
- a safer deployment checklist

## Project Isolation

This repository belongs only to the `260703_Drink Reminder` project.

It should not contain files, notes, images, scripts, TODOs, or Git history from other projects.
