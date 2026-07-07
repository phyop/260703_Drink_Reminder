# Google Sheet Schema

This project uses one Google Sheet tab named `Log`.

Each row represents one calendar day in the configured timezone.

## Required Sheet Name

```text
Log
```

## Header Row

Create these columns in row 1:

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

## Column Details

| Column | Purpose |
| --- | --- |
| `date` | Daily record key, formatted as `yyyy-MM-dd` |
| `water_ml` | Total water amount for the day |
| `water_cups` | Number of completed 250 cc cups |
| `vitamin_c` | `TRUE` when Vitamin C has been logged |
| `vitamin_time` | Time when Vitamin C was logged |
| `bp_sys` | Systolic blood pressure |
| `bp_dia` | Diastolic blood pressure |
| `weight_kg` | Body weight in kilograms |
| `bp_weight_time` | Time when blood pressure and weight were logged |
| `last_water_time` | Time of the most recent water log |
| `water_0740` to `water_2145` | One boolean slot per water reminder |
| `notes` | Optional notes |
| `updated_at` | Last update timestamp |

## Formulas Added By The Script

When a new daily row is created, the script writes formulas for:

```text
water_ml = water_cups * 250
water_cups = COUNTIF(water slots, TRUE)
```

Users do not need to type those formulas manually for each new day.

## Why One Row Per Day

The system uses one row per day because it makes daily review simple:

- water completion is visible at a glance
- Vitamin C status is a single boolean
- blood pressure and weight are stored in fixed columns
- weekly summaries are easy to generate

## Do Not Store Secrets In Google Sheets

Do not store these values in the sheet:

- Telegram bot token
- Telegram chat ID
- webhook secret
- OpenAI API key

Use Apps Script Script Properties for those values instead.
