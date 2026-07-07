# Google Sheet Schema

This project uses Google Sheets as the first storage layer because it is easy to inspect, edit, export, and chart.

## Logs

Create a sheet named:

```text
Logs
```

Columns:

| Column | Purpose | Example |
|---|---|---|
| Timestamp | Full event timestamp | `2026-07-07 09:30:00` |
| Date | Date for filtering | `2026-07-07` |
| Time | Time for daily review | `09:30:00` |
| Chat ID | Telegram chat identifier | `123456789` |
| Type | Event type | `water` |
| Amount | Numeric amount | `250` |
| Unit | Unit of amount | `cc` |
| Raw Text | Original Telegram message | `water 250` |
| Note | Optional note | `after lunch` |

## Config

Create a sheet named:

```text
Config
```

Suggested columns:

| Column | Purpose | Example |
|---|---|---|
| Key | Configuration name | `daily_target_cc` |
| Value | Configuration value | `2500` |
| Note | Human-readable description | `Example daily target` |

## Formatting Tips

- Keep `Chat ID` as plain text.
- Keep `Amount` numeric.
- Use separate `Date` and `Time` columns for easier filtering.
- Do not store Telegram tokens in the sheet.
- Do not publish real personal health logs in a public repository.
