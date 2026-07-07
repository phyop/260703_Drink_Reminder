const WATER_TIMES = ["07:40", "08:45", "10:00", "11:00", "14:00", "15:15", "16:30", "17:45", "20:30", "21:45"];
const TIMEZONE = "Asia/Taipei";
const WATER_ML_PER_CUP = 250;

const COL = {
  date: 1,
  waterMl: 2,
  waterCups: 3,
  vitaminC: 4,
  vitaminTime: 5,
  bpSys: 6,
  bpDia: 7,
  weightKg: 8,
  bpWeightTime: 9,
  lastWaterTime: 10,
  waterStart: 11,
  notes: 21,
  updatedAt: 22,
};

function setupTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => ["checkReminders", "sendWeeklyReport"].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("checkReminders")
    .timeBased()
    .everyMinutes(1)
    .create();

  ScriptApp.newTrigger("sendWeeklyReport")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.THURSDAY)
    .atHour(23)
    .nearMinute(50)
    .everyWeeks(1)
    .create();
}

function checkReminders() {
  const now = new Date();
  const dateKey = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  const hhmm = Utilities.formatDate(now, TIMEZONE, "HH:mm");
  const row = getOrCreateDateRow_(dateKey);

  WATER_TIMES.forEach((time, index) => {
    if (isDue_(hhmm, time) && !wasSent_(dateKey, `water_${time}`)) {
      sendTelegramMessage_(
        `Water reminder ${time}\nPlease drink ${WATER_ML_PER_CUP} cc.`,
        [[button_("Done 250cc", `water:${index}`)]]
      );
      markSent_(dateKey, `water_${time}`);
    }
  });

  if (isDue_(hhmm, "15:00") && !wasSent_(dateKey, "vitamin_main")) {
    sendTelegramMessage_("15:00 Vitamin C reminder.\nTap the button after taking it.", [[button_("Vitamin C done", "vitamin:done")]]);
    markSent_(dateKey, "vitamin_main");
  }

  if (isDue_(hhmm, "17:00") && !wasSent_(dateKey, "vitamin_backup")) {
    const record = getRecord_(row);
    if (record.vitaminC !== true) {
      sendTelegramMessage_("Backup reminder: Vitamin C has not been logged yet.", [[button_("Vitamin C done", "vitamin:done")]]);
    }
    markSent_(dateKey, "vitamin_backup");
  }

  if (isDue_(hhmm, "20:00") && !wasSent_(dateKey, "bp_weight_main")) {
    sendTelegramMessage_(
      "20:00 Blood pressure and weight reminder.\nReply like: BP 128/82 weight 72.4",
      [[button_("Log later", "bp:later")]]
    );
    markSent_(dateKey, "bp_weight_main");
  }

  if (isDue_(hhmm, "21:30") && !wasSent_(dateKey, "bp_weight_backup")) {
    const record = getRecord_(row);
    if (!record.bpSys || !record.bpDia || !record.weightKg) {
      sendTelegramMessage_("Backup reminder: blood pressure and weight are not fully logged yet.\nReply like: BP 128/82 weight 72.4");
    }
    markSent_(dateKey, "bp_weight_backup");
  }

  if (isThursday_(now) && isDue_(hhmm, "23:50")) {
    sendWeeklyReport();
  }
}

function doPost(e) {
  try {
    const secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
    if (secret && (!e.parameter || e.parameter.secret !== secret)) {
      return ContentService.createTextOutput("forbidden");
    }

    const update = JSON.parse(e.postData.contents);
    const updateId = update.update_id ? String(update.update_id) : "";
    const cache = CacheService.getScriptCache();
    if (updateId && cache.get(`update:${updateId}`)) {
      return ContentService.createTextOutput("ok");
    }

    if (update.callback_query) {
      handleCallback_(update.callback_query);
    } else if (update.message && update.message.text) {
      handleText_(update.message.text);
    }
    if (updateId) {
      cache.put(`update:${updateId}`, "1", 21600);
    }
  } catch (error) {
    Logger.log(`doPost error: ${error && error.stack ? error.stack : error}`);
    safeNotifyAdmin_(`Health reminder error: ${error && error.message ? error.message : error}`);
  }
  return ContentService.createTextOutput("ok");
}

function handleCallback_(callbackQuery) {
  const data = callbackQuery.data || "";
  const dateKey = todayKey_();
  const row = getOrCreateDateRow_(dateKey);
  const chatId = callbackQuery.message && callbackQuery.message.chat ? callbackQuery.message.chat.id : "";

  if (data.startsWith("water:")) {
    const index = Number(data.split(":")[1]);
    if (index >= 0 && index < WATER_TIMES.length) {
      const sheet = getLogSheet_();
      const waterCell = sheet.getRange(row, COL.waterStart + index);
      if (waterCell.getValue() === true) {
        answerCallbackQuery_(callbackQuery.id, `${WATER_TIMES[index]} water was already logged.`);
        sendTelegramMessageToChat_(chatId, `Already logged: ${WATER_TIMES[index]} water ${WATER_ML_PER_CUP} cc.`);
        return;
      }
      waterCell.setValue(true);
      sheet.getRange(row, COL.lastWaterTime).setValue(nowTime_());
      sheet.getRange(row, COL.updatedAt).setValue(new Date());
      answerCallbackQuery_(callbackQuery.id, `Logged ${WATER_TIMES[index]} water.`);
      sendTelegramMessageToChat_(chatId, `Logged: ${WATER_TIMES[index]} water ${WATER_ML_PER_CUP} cc.`);
      return;
    }
  }

  if (["vitamin:done", "vitamin_done", "vitamin"].includes(data)) {
    const sheet = getLogSheet_();
    const vitaminCell = sheet.getRange(row, COL.vitaminC);
    if (vitaminCell.getValue() === true) {
      answerCallbackQuery_(callbackQuery.id, "Vitamin C was already logged.");
      sendTelegramMessageToChat_(chatId, "Already logged: Vitamin C done. The 17:00 backup reminder will be skipped.");
      return;
    }
    vitaminCell.setValue(true);
    sheet.getRange(row, COL.vitaminTime).setValue(nowTime_());
    sheet.getRange(row, COL.updatedAt).setValue(new Date());
    answerCallbackQuery_(callbackQuery.id, "Logged Vitamin C.");
    sendTelegramMessageToChat_(chatId, "Logged: Vitamin C done. The 17:00 backup reminder will be skipped.");
    return;
  }

  if (data === "bp:later") {
    answerCallbackQuery_(callbackQuery.id, "OK. I will remind again at 21:30 if BP and weight are not logged.");
    return;
  }

  answerCallbackQuery_(callbackQuery.id, "This button is not supported by the current script.");
  sendTelegramMessageToChat_(chatId, `Unsupported button data: ${data}`);
}

function handleText_(text) {
  const parsed = parseBpWeight_(text);
  if (!parsed) {
    sendTelegramMessage_(`Received but not parsed: ${text}\nUse: BP 120/80 weight 70`);
    return;
  }

  const sheet = getLogSheet_();
  const row = getOrCreateDateRow_(todayKey_());
  sheet.getRange(row, COL.bpSys).setValue(parsed.sys);
  sheet.getRange(row, COL.bpDia).setValue(parsed.dia);
  sheet.getRange(row, COL.weightKg).setValue(parsed.weightKg);
  sheet.getRange(row, COL.bpWeightTime).setValue(nowTime_());
  sheet.getRange(row, COL.updatedAt).setValue(new Date());
  sendTelegramMessage_(`Logged: BP ${parsed.sys}/${parsed.dia}, weight ${parsed.weightKg} kg. The 21:30 backup reminder will be skipped.`);
}

function sendTestMessage() {
  sendTelegramMessage_("Health reminder system test succeeded.");
}

function sendWeeklyReport() {
  const dateKey = todayKey_();
  if (wasSent_(dateKey, "weekly_report")) {
    return;
  }

  const report = buildWeeklyReport_();
  const analysis = analyzeWeeklyReport_(report);
  const message = analysis || [
    "Weekly health summary for ChatGPT",
    "",
    "Copy the block below into ChatGPT for analysis:",
    "",
    report,
  ].join("\n");

  sendTelegramMessageInChunks_(message);
  markSent_(dateKey, "weekly_report");
}

function setTelegramWebhook() {
  const props = PropertiesService.getScriptProperties();
  const token = (props.getProperty("TELEGRAM_BOT_TOKEN") || "").trim();
  const webAppUrl = (props.getProperty("WEB_APP_URL") || "").trim();
  const secret = (props.getProperty("WEBHOOK_SECRET") || "").trim();
  if (!token || !webAppUrl) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or WEB_APP_URL in Script Properties.");
  }
  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  const webhookUrl = secret ? `${webAppUrl}?secret=${encodeURIComponent(secret)}` : webAppUrl;
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: true,
    }),
    muteHttpExceptions: true,
  });
  Logger.log(res.getContentText());
}

function parseBpWeight_(text) {
  const bp = text.match(/(?:\u8840\u58d3|bp)\s*[:\uff1a]?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i);
  const weight = text.match(/(?:\u9ad4\u91cd|weight)\s*[:\uff1a]?\s*(\d{2,3}(?:\.\d+)?)/i);
  if (!bp || !weight) {
    return null;
  }
  return {
    sys: Number(bp[1]),
    dia: Number(bp[2]),
    weightKg: Number(weight[1]),
  };
}

function buildWeeklyReport_() {
  const endDate = startOfDay_(new Date());
  const startDate = addDays_(endDate, -6);
  const rows = getLogSheet_().getDataRange().getValues();
  const dataRows = rows.slice(1)
    .filter((row) => row[COL.date - 1])
    .map((row) => ({ row, date: startOfDay_(coerceDate_(row[COL.date - 1])) }))
    .filter((entry) => entry.date >= startDate && entry.date <= endDate)
    .sort((a, b) => a.date - b.date);

  const lines = [];
  lines.push(`Weekly health report (${formatDate_(startDate)} to ${formatDate_(endDate)})`);
  lines.push("Targets: water 2500 ml/day, Vitamin C daily, BP+weight daily.");
  lines.push("");
  lines.push("Daily rows:");

  let totalWater = 0;
  let waterDays = 0;
  let vitaminDays = 0;
  let bpDays = 0;
  let weightCount = 0;
  let weightSum = 0;
  const bpSys = [];
  const bpDia = [];

  dataRows.forEach(({ row, date }) => {
    const waterMl = Number(row[COL.waterMl - 1]) || 0;
    const waterCups = Number(row[COL.waterCups - 1]) || 0;
    const vitamin = row[COL.vitaminC - 1] === true ? "yes" : "no";
    const sys = Number(row[COL.bpSys - 1]) || "";
    const dia = Number(row[COL.bpDia - 1]) || "";
    const weight = Number(row[COL.weightKg - 1]) || "";
    const bpText = sys && dia ? `${sys}/${dia}` : "missing";
    const weightText = weight ? `${weight} kg` : "missing";

    totalWater += waterMl;
    if (waterMl >= 2500) waterDays += 1;
    if (vitamin === "yes") vitaminDays += 1;
    if (sys && dia && weight) {
      bpDays += 1;
      bpSys.push(sys);
      bpDia.push(dia);
      weightSum += weight;
      weightCount += 1;
    }

    lines.push(`${formatDate_(date)}: water ${waterMl} ml (${waterCups}/10 cups), vitamin C ${vitamin}, BP ${bpText}, weight ${weightText}`);
  });

  lines.push("");
  lines.push("Summary:");
  lines.push(`Water average: ${round_(totalWater / 7, 0)} ml/day; target met ${waterDays}/7 days.`);
  lines.push(`Vitamin C completed: ${vitaminDays}/7 days.`);
  lines.push(`BP+weight completed: ${bpDays}/7 days.`);
  if (bpSys.length) {
    lines.push(`Average BP: ${round_(average_(bpSys), 0)}/${round_(average_(bpDia), 0)}.`);
  }
  if (weightCount) {
    lines.push(`Average weight: ${round_(weightSum / weightCount, 1)} kg.`);
  }
  lines.push("");
  lines.push("Please analyze trends, adherence, missing data, and practical next-week suggestions. Do not diagnose; suggest when to consult a clinician if readings are concerning.");

  return lines.join("\n");
}

function analyzeWeeklyReport_(report) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = (props.getProperty("OPENAI_API_KEY") || "").trim();
  if (!apiKey) {
    return "";
  }

  const model = (props.getProperty("OPENAI_MODEL") || "gpt-5.2-mini").trim();
  const prompt = [
    "You are helping summarize personal health tracking data.",
    "Provide concise, non-diagnostic feedback in Traditional Chinese.",
    "Focus on adherence, trends, missing data, and practical next-week actions.",
    "Tell the user to consult a clinician for concerning or persistent abnormal readings.",
    "",
    report,
  ].join("\n");

  const res = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: `Bearer ${apiKey}` },
    payload: JSON.stringify({
      model,
      input: prompt,
      max_output_tokens: 1200,
    }),
    muteHttpExceptions: true,
  });

  const status = res.getResponseCode();
  const body = res.getContentText();
  if (status < 200 || status >= 300) {
    return [
      "Weekly health summary for ChatGPT",
      "",
      `OpenAI API analysis failed: HTTP ${status}`,
      "Raw weekly summary:",
      "",
      report,
    ].join("\n");
  }

  const json = JSON.parse(body);
  const output = extractOpenAIText_(json);
  if (!output) {
    return ["Weekly health summary generated, but OpenAI returned no text.", "", report].join("\n");
  }
  return `Weekly ChatGPT analysis\n\n${output}\n\nRaw data:\n${report}`;
}

function extractOpenAIText_(json) {
  if (json.output_text) {
    return json.output_text;
  }
  const chunks = [];
  (json.output || []).forEach((item) => {
    (item.content || []).forEach((content) => {
      if (content.text) {
        chunks.push(content.text);
      }
    });
  });
  return chunks.join("\n").trim();
}

function getRecord_(row) {
  const values = getLogSheet_().getRange(row, 1, 1, 22).getValues()[0];
  return {
    vitaminC: values[COL.vitaminC - 1] === true,
    bpSys: values[COL.bpSys - 1],
    bpDia: values[COL.bpDia - 1],
    weightKg: values[COL.weightKg - 1],
  };
}

function getOrCreateDateRow_(dateKey) {
  const sheet = getLogSheet_();
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const values = sheet.getRange(2, COL.date, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    const cellDate = formatDateCell_(values[i][0]);
    if (cellDate === dateKey) {
      return i + 2;
    }
  }

  const row = sheet.getLastRow() + 1;
  sheet.getRange(row, COL.date).setValue(dateKey);
  sheet.getRange(row, COL.waterMl).setFormula(`=C${row}*${WATER_ML_PER_CUP}`);
  sheet.getRange(row, COL.waterCups).setFormula(`=COUNTIF(K${row}:T${row},TRUE)`);
  return row;
}

function getLogSheet_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) {
    throw new Error("Missing SPREADSHEET_ID in Script Properties.");
  }
  return SpreadsheetApp.openById(id).getSheetByName("Log");
}

function sendTelegramMessage_(text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const chatId = (props.getProperty("TELEGRAM_CHAT_ID") || "").trim();
  sendTelegramMessageToChat_(chatId, text, keyboard);
}

function sendTelegramMessageToChat_(chatId, text, keyboard) {
  const props = PropertiesService.getScriptProperties();
  const token = (props.getProperty("TELEGRAM_BOT_TOKEN") || "").trim();
  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or Telegram chat id.");
  }
  const payload = { chat_id: chatId, text };
  if (keyboard) {
    payload.reply_markup = { inline_keyboard: keyboard };
  }
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = res.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Telegram sendMessage failed: HTTP ${status} ${res.getContentText()}`);
  }
}

function safeNotifyAdmin_(text) {
  try {
    sendTelegramMessage_(text);
  } catch (notifyError) {
    Logger.log(`safeNotifyAdmin error: ${notifyError && notifyError.stack ? notifyError.stack : notifyError}`);
  }
}

function sendTelegramMessageInChunks_(text) {
  const maxLen = 3500;
  for (let i = 0; i < text.length; i += maxLen) {
    sendTelegramMessage_(text.slice(i, i + maxLen));
  }
}

function answerCallbackQuery_(callbackQueryId, text) {
  const token = (PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN") || "").trim();
  const payload = { callback_query_id: callbackQueryId };
  if (text) {
    payload.text = text;
  }
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const status = res.getResponseCode();
  if (status < 200 || status >= 300) {
    Logger.log(`Telegram answerCallbackQuery failed: HTTP ${status} ${res.getContentText()}`);
  }
}

function button_(text, callbackData) {
  return { text, callback_data: callbackData };
}

function isDue_(nowHhmm, targetHhmm) {
  const diff = minutesOf_(nowHhmm) - minutesOf_(targetHhmm);
  return diff >= 0 && diff < 3;
}

function minutesOf_(hhmm) {
  const parts = hhmm.split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function wasSent_(dateKey, key) {
  return PropertiesService.getScriptProperties().getProperty(`sent:${dateKey}:${key}`) === "1";
}

function markSent_(dateKey, key) {
  PropertiesService.getScriptProperties().setProperty(`sent:${dateKey}:${key}`, "1");
}

function startOfDay_(date) {
  return new Date(Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd") + "T00:00:00+08:00");
}

function addDays_(date, days) {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function coerceDate_(value) {
  if (value instanceof Date) {
    return value;
  }
  return new Date(value);
}

function formatDate_(date) {
  return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd");
}

function average_(values) {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round_(value, digits) {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}

function isThursday_(date) {
  const parts = Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd").split("-").map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay() === 4;
}

function todayKey_() {
  return Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");
}

function nowTime_() {
  return Utilities.formatDate(new Date(), TIMEZONE, "HH:mm:ss");
}

function formatDateCell_(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd");
  }
  return String(value).slice(0, 10);
}
