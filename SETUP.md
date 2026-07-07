# Drink Reminder Health Tracking System Setup Guide

This guide assumes you have never used Google Apps Script, Telegram Bot API, webhooks, or Apps Script Script Properties before.

If you follow the steps carefully, you will build a cloud-based health reminder system that sends Telegram notifications to your Android phone even when your computer is turned off.

## What This System Does

- Sends 10 daily water reminders.
- Tracks 250 cc per cup, for a daily target of 2500 cc.
- Sends a Vitamin C reminder at 15:00.
- Skips the 17:00 Vitamin C backup reminder if Vitamin C has already been logged.
- Sends a blood pressure and weight reminder at 20:00.
- Skips the 21:30 blood pressure and weight backup reminder if both values have already been logged.
- Stores daily records in Google Sheets.
- Sends a weekly summary every Thursday night.
- Can optionally call the OpenAI API for weekly analysis if an API key is configured.

## Daily Water Schedule

```text
07:40
08:45
10:00
11:00
14:00
15:15
16:30
17:45
20:30
21:45
```

## Architecture

```text
Google Apps Script time trigger
        |
        v
checkReminders()
        |
        v
Telegram reminder message
        |
        v
User taps a button or sends a text reply
        |
        v
Telegram webhook
        |
        v
Google Apps Script Web App
        |
        v
Google Sheets Log
```

## Requirements

You need:

- a Google account
- a Telegram account
- a Google Sheet
- a Google Apps Script project
- the `Code.gs` file from this repository
- about 30 to 60 minutes for setup and testing

## Step 1: Create the Google Sheet

1. Open [Google Sheets](https://sheets.google.com/).
2. Create a new spreadsheet.
3. Recommended spreadsheet name:

```text
Health Reminder Log
```

4. Rename the first sheet tab to:

```text
Log
```

5. Add this header row in row 1:

```text
date
water_ml
water_cups
vitamin_c
vitamin_time
bp_sys
bp_dia
weight_kg
bp_weight_time
last_water_time
water_0740
water_0845
water_1000
water_1100
water_1400
water_1515
water_1630
water_1745
water_2030
water_2145
notes
updated_at
```

6. Copy the Spreadsheet ID from the URL.

A Google Sheet URL looks like this:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

Copy the value between `/d/` and `/edit`.

You will later paste it into Apps Script as:

```text
SPREADSHEET_ID
```

## Step 2: Create a Telegram Bot

1. Open Telegram.
2. Search for the official bot:

```text
@BotFather
```

3. Send:

```text
/newbot
```

4. BotFather will ask for a display name. Example:

```text
Drink Reminder
```

5. BotFather will ask for a username. The username must end with `bot`. Example:

```text
YourDrinkReminder_bot
```

6. BotFather will return a bot token that looks like this:

```text
<TELEGRAM_BOT_TOKEN>
```

This value is:

```text
TELEGRAM_BOT_TOKEN
```

Important: do not publish your bot token on GitHub, Medium, screenshots, public docs, or group chats. Anyone with the token can control your bot.

If your token is exposed:

1. Go back to BotFather.
2. Send `/revoke`.
3. Select your bot.
4. Generate a new token.
5. Update the Apps Script Script Property named `TELEGRAM_BOT_TOKEN`.

## Step 3: Get Your Telegram Chat ID

1. Open your new Telegram bot.
2. Send a message to it:

```text
Hello
```

3. Open this URL in a browser:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

Replace `<TELEGRAM_BOT_TOKEN>` with your real bot token.

Correct URL format:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

Important: the word `bot` must appear before the token.

4. You should see JSON similar to this:

```json
{
  "ok": true,
  "result": [
    {
      "message": {
        "chat": {
          "id": 123456789
        },
        "text": "Hello"
      }
    }
  ]
}
```

5. The number in `chat.id` is:

```text
TELEGRAM_CHAT_ID
```

If you see this:

```json
{"ok":true,"result":[]}
```

then your bot has not received any message yet. Send `Hello` to the bot in Telegram, then refresh the `getUpdates` URL.

## Step 4: Create the Google Apps Script Project

1. Open [Google Apps Script](https://script.google.com/).
2. Create a new project.
3. Recommended project name:

```text
Drink_Reminder
```

4. Click `Editor` in the left sidebar.
5. Open `Code.gs`.
6. Delete the default content.
7. Paste the full content of this repository's `Code.gs`.
8. Click Save.

If you see syntax errors, stop and confirm that the whole `Code.gs` file was pasted correctly.

## Step 5: Configure Apps Script Script Properties

This is the most commonly missed setup step.

Script Properties are not part of `Code.gs`, and they are not Google Sheet cells. They are project-level key-value settings inside Apps Script. This project uses them to store secrets and configuration values such as the Telegram bot token, chat ID, spreadsheet ID, and Web App URL.

### Where To Find Script Properties

1. Open your Apps Script project.
2. In the left sidebar, click the gear icon named `Project Settings`.
3. Scroll down to:

```text
Script Properties
```

4. Click:

```text
Add script property
```

5. Each row has two fields:

```text
Property
Value
```

Add every required property below.

### Required Script Properties

| Property | Value | Where to get it |
| --- | --- | --- |
| `SPREADSHEET_ID` | Your Google Sheet ID | The part between `/d/` and `/edit` in the Sheet URL |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | BotFather |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID | The `chat.id` value from `getUpdates` |
| `WEBHOOK_SECRET` | A private random string | You choose it, for example `my-health-secret-2026` |

### Property Added After Deployment

You cannot fill this property until after you deploy the Apps Script Web App:

| Property | Value | Where to get it |
| --- | --- | --- |
| `WEB_APP_URL` | Apps Script Web App URL | Generated after Web App deployment |

### Optional Script Properties

| Property | When to use it |
| --- | --- |
| `OPENAI_API_KEY` | Only if you want Apps Script to call the OpenAI API automatically for weekly summaries |
| `OPENAI_MODEL` | Only if you want to specify the OpenAI model |

If `OPENAI_API_KEY` is not set, the system still works. The weekly report will be sent as raw text to Telegram, and you can manually paste it into ChatGPT.

## Step 6: Test Telegram Delivery First

Before setting up the webhook, confirm that Apps Script can send a Telegram message.

1. Go back to the Apps Script `Editor`.
2. In the function dropdown at the top, select:

```text
sendTestMessage
```

3. Click `Run`.
4. The first run will ask for Google authorization.
5. After authorization, your Telegram bot should send:

```text
Health reminder system test succeeded.
```

If this step fails, do not continue to webhook setup yet.

Common causes:

- `TELEGRAM_BOT_TOKEN` is wrong.
- The token has leading or trailing spaces.
- `TELEGRAM_CHAT_ID` is wrong.
- You have not started a chat with your bot.

## Step 7: Deploy Apps Script as a Web App

1. In Apps Script, click `Deploy` in the top-right corner.
2. Select:

```text
New deployment
```

3. Select deployment type:

```text
Web app
```

4. Recommended description:

```text
v1 initial web app deployment
```

5. Set `Execute as` to:

```text
Me
```

6. Set `Who has access` to:

```text
Anyone
```

7. Click `Deploy`.
8. Copy the Web App URL.

It should look similar to:

```text
https://script.google.com/macros/s/<DEPLOYMENT_ID>/exec
```

9. Go back to `Project Settings` -> `Script Properties`.
10. Add:

```text
WEB_APP_URL = your Web App URL
```

The URL should usually end with `/exec`.

## Step 8: Set the Telegram Webhook

1. Go back to the Apps Script `Editor`.
2. In the function dropdown, select:

```text
setTelegramWebhook
```

3. Click `Run`.
4. The execution log should show:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

This means Telegram now knows where to send bot messages and button callbacks.

## Step 9: Create Reminder Triggers

1. In the Apps Script function dropdown, select:

```text
setupTrigger
```

2. Click `Run`.
3. In the left sidebar, open `Triggers`.
4. You should see at least two triggers:

```text
checkReminders
sendWeeklyReport
```

`checkReminders` runs every minute and checks whether a reminder is due.

`sendWeeklyReport` runs weekly on Thursday night.

## Step 10: Test User Reporting

### Test Blood Pressure and Weight

Send this to your Telegram bot:

```text
BP 120/80 weight 70
```

The parser also supports an alternate localized keyword format, but the English format above is recommended for public setup and testing.

Successful reply:

```text
Logged: BP 120/80, weight 70 kg. The 21:30 backup reminder will be skipped.
```

In Google Sheets, today's row should contain:

- `bp_sys = 120`
- `bp_dia = 80`
- `weight_kg = 70`
- `bp_weight_time` has a timestamp

### Test Vitamin C

When the 15:00 reminder appears, tap:

```text
Vitamin C done
```

Successful reply:

```text
Logged: Vitamin C done. The 17:00 backup reminder will be skipped.
```

If you tap the same old button again, the bot should reply:

```text
Already logged: Vitamin C done. The 17:00 backup reminder will be skipped.
```

That is normal. It means the system did not write a duplicate record.

### Test Water

When a water reminder appears, tap:

```text
Done 250cc
```

Successful reply:

```text
Logged: 15:15 water 250 cc.
```

If you tap the same old button again, the bot should reply:

```text
Already logged: 15:15 water 250 cc.
```

That is normal. It means the same cup was not counted twice.

## Important: Saving Code Is Not the Same as Updating the Web App

This is critical.

In Apps Script:

```text
Save Code.gs
```

does not mean:

```text
Telegram webhook is now using the new code
```

If you change `Code.gs`, follow this deployment flow:

1. Save `Code.gs`.
2. Click `Deploy`.
3. Click `Manage deployments`.
4. Select the active Web App deployment.
5. Click the pencil icon to edit it.
6. Set `Version` to:

```text
New version
```

7. Add a clear deployment description, for example:

```text
v2 fix Telegram callback handling
```

8. Click `Deploy`.

If you only save the code but do not update the deployment, Telegram will continue calling the old deployed version. This creates the confusing situation where the code looks fixed but the bot still behaves like the old version.

## Recommended Deployment Descriptions

Do not leave every deployment named `Untitled`.

Use meaningful descriptions:

```text
v1 initial web app deployment
v2 fix webhook setup
v3 fix BP and weight parsing
v4 add duplicate callback protection
v5 add weekly report
v6 stable reminders and Telegram logging
v7 fix Vitamin C callback responses
v8 make callback popup non-blocking
v9 chat-confirm already logged callbacks
```

This makes debugging much easier later.

## Troubleshooting

### `getUpdates` returns `{"ok":true,"result":[]}`

Cause:

The bot has not received any message yet.

Fix:

1. Open your bot in Telegram.
2. Send `Hello`.
3. Refresh the `getUpdates` URL.

### Telegram API returns 404 Not Found

Common causes:

- The URL is missing the word `bot`.
- The token is wrong.
- The token was revoked.
- The token has leading or trailing spaces.

Correct format:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getUpdates
```

Wrong format:

```text
https://api.telegram.org/<TELEGRAM_BOT_TOKEN>/getUpdates
```

### `sendTestMessage` works, but Telegram replies do nothing

Possible causes:

- You have not deployed the Web App.
- `WEB_APP_URL` is missing.
- `setTelegramWebhook` has not been run.
- You changed the code but did not create a new deployed version.
- `WEBHOOK_SECRET` does not match the webhook URL.

Debug order:

1. Confirm `WEB_APP_URL` ends with `/exec`.
2. Run `setTelegramWebhook`.
3. Confirm the log says `Webhook was set`.
4. Send `BP 120/80 weight 70` to the bot.
5. Open Apps Script `Executions`.
6. Check whether `doPost` ran.

### Vitamin C button looks like it does nothing

In older versions, if Vitamin C was already logged, the system only showed a Telegram callback popup. That popup was easy to miss.

The current behavior sends a normal chat message:

```text
Already logged: Vitamin C done. The 17:00 backup reminder will be skipped.
```

If there is no reply at all:

1. Confirm the active deployment is the latest version.
2. Confirm `doPost` appears in Apps Script `Executions`.
3. Run `setTelegramWebhook` again.

### Water button replies many times

Possible causes:

- Telegram resent the callback.
- The old version did not check whether that water slot was already logged.
- The user tapped the same old button multiple times.

The current code checks whether the corresponding water cell is already `TRUE`. If it is already logged, it replies:

```text
Already logged: 15:15 water 250 cc.
```

It does not increase the water count again.

### Why are there fewer than 10 `sent:YYYY-MM-DD:water_*` properties?

That is normal.

The `sent:*` Script Properties are not a complete daily checklist. They only record reminders that have already been sent.

There are 10 water reminder times, but only the times that have already occurred today will appear as `sent:*` keys.

### When is the 21:30 backup reminder skipped?

The 21:30 backup reminder is skipped if today's row already has:

- systolic blood pressure
- diastolic blood pressure
- weight

In sheet terms, these must be filled:

```text
bp_sys
bp_dia
weight_kg
```

### When is the 17:00 Vitamin C backup reminder skipped?

The 17:00 backup reminder is skipped if today's:

```text
vitamin_c
```

field is already `TRUE`.

## Security Checklist

Never commit these values to GitHub:

- Telegram bot token
- Telegram chat ID
- Apps Script Web App URL if it contains a secret
- `WEBHOOK_SECRET`
- OpenAI API key
- Google OAuth credentials

Public documentation should only use placeholders:

```text
<TELEGRAM_BOT_TOKEN>
<TELEGRAM_CHAT_ID>
<WEBHOOK_SECRET>
<WEB_APP_URL>
<SPREADSHEET_ID>
```

## Final Verification Checklist

Before considering the setup complete, verify every item:

- [ ] Google Sheet has a `Log` sheet.
- [ ] The `Log` header row is complete.
- [ ] Apps Script `Code.gs` has been fully pasted.
- [ ] Script Properties include `SPREADSHEET_ID`.
- [ ] Script Properties include `TELEGRAM_BOT_TOKEN`.
- [ ] Script Properties include `TELEGRAM_CHAT_ID`.
- [ ] Script Properties include `WEBHOOK_SECRET`.
- [ ] `sendTestMessage` sends a Telegram message.
- [ ] The Web App has been deployed.
- [ ] Script Properties include `WEB_APP_URL`.
- [ ] `setTelegramWebhook` logs `Webhook was set`.
- [ ] `setupTrigger` has been run.
- [ ] The Triggers page includes `checkReminders`.
- [ ] The Triggers page includes `sendWeeklyReport`.
- [ ] Sending `BP 120/80 weight 70` writes to Google Sheets.
- [ ] A water button writes to Google Sheets.
- [ ] The Vitamin C button writes to Google Sheets.
- [ ] Tapping an old button replies with `Already logged` and does not duplicate the record.

After all items pass, the system is ready for daily use.
