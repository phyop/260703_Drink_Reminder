# Drink Reminder Health Tracking System

A cloud-based personal health reminder system using Telegram, Google Apps Script, and Google Sheets.

It sends Android-friendly Telegram reminders, records daily health data in Google Sheets, skips backup reminders when an item has already been logged, and can generate weekly summaries for ChatGPT analysis.

## Features

- 10 daily water reminders, 250 cc each.
- Daily water target: 2500 cc.
- Vitamin C reminder at 15:00.
- Vitamin C backup reminder at 17:00 only if not already logged.
- Blood pressure and weight reminder at 20:00.
- Blood pressure and weight backup reminder at 21:30 only if not already logged.
- Telegram inline buttons for water and Vitamin C.
- Text parsing for blood pressure and weight.
- Google Sheets daily log.
- Weekly summary every Thursday night.
- Optional OpenAI API integration for weekly analysis.

## Why This Exists

ChatGPT scheduled tasks are useful, but the active task limit can be too small for a workflow with many water reminders plus health backups.

This project moves the reminder engine to Google Apps Script and uses Telegram as the mobile notification channel.

The computer does not need to stay on.

## Architecture

```text
Google Apps Script trigger
        |
        v
Telegram reminder
        |
        v
User taps button or sends text
        |
        v
Telegram webhook
        |
        v
Apps Script Web App
        |
        v
Google Sheets
```

## Main Files

| File | Purpose |
| --- | --- |
| `Code.gs` | Main Google Apps Script source code |
| `SETUP.md` | Step-by-step setup guide for first-time users |

## Quick Start

Read the full setup guide:

[SETUP.md](SETUP.md)

Do not skip the Script Properties section. Most setup failures come from missing or incorrect Script Properties.

## Required Apps Script Properties

| Property | Description |
| --- | --- |
| `SPREADSHEET_ID` | Google Sheet ID |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather |
| `TELEGRAM_CHAT_ID` | Telegram chat ID from `getUpdates` |
| `WEBHOOK_SECRET` | Private secret string used by the webhook |
| `WEB_APP_URL` | Apps Script Web App URL, added after deployment |

Optional:

| Property | Description |
| --- | --- |
| `OPENAI_API_KEY` | Enables automatic OpenAI weekly analysis |
| `OPENAI_MODEL` | Optional model override |

## Basic Usage

### Log Blood Pressure and Weight

Send either format to the Telegram bot:

```text
BP 120/80 weight 70
```

The parser also supports an alternate localized keyword format, but the English format above is recommended for public setup and testing.

### Log Water

Tap the Telegram inline button:

```text
Done 250cc
```

### Log Vitamin C

Tap the Telegram inline button:

```text
Vitamin C done
```

## Important Deployment Rule

In Google Apps Script, saving `Code.gs` is not enough.

After changing code, always:

1. Save `Code.gs`.
2. Open `Deploy` -> `Manage deployments`.
3. Edit the active Web App deployment.
4. Select `New version`.
5. Add a clear deployment description.
6. Deploy.

If you skip this, Telegram will keep calling the old deployed version.

## Security

Never commit real secrets to GitHub:

- Telegram bot token
- Telegram chat ID
- webhook secret
- OpenAI API key
- private Web App URLs containing secrets

Use placeholders in public documentation:

```text
<TELEGRAM_BOT_TOKEN>
<TELEGRAM_CHAT_ID>
<WEBHOOK_SECRET>
<WEB_APP_URL>
<SPREADSHEET_ID>
```

## License

Use and adapt this project for your own personal automation workflow.
