const LOG_SHEET_NAME = 'Logs';
const CONFIG_SHEET_NAME = 'Config';

function doGet() {
  return ContentService.createTextOutput('Drink Reminder bot is running.');
}

function doPost(e) {
  const update = JSON.parse(e.postData.contents);
  const message = update.message;

  if (!message || !message.chat || !message.text) {
    return jsonResponse({ ok: true, skipped: true });
  }

  const chatId = String(message.chat.id);
  const text = message.text.trim();

  if (text === '/start') {
    PropertiesService.getScriptProperties().setProperty('DEFAULT_CHAT_ID', chatId);
    sendTelegramMessage(chatId, 'Drink Reminder is connected. Try: water 250');
    return jsonResponse({ ok: true, command: 'start' });
  }

  const parsed = parseDrinkMessage(text);
  appendLog(chatId, parsed.type, parsed.amount, parsed.unit, text, parsed.note);
  sendTelegramMessage(chatId, `Logged: ${parsed.type} ${parsed.amount || ''} ${parsed.unit || ''}`.trim());

  return jsonResponse({ ok: true });
}

function setupSheets() {
  const spreadsheet = SpreadsheetApp.openById(getRequiredProperty('SHEET_ID'));

  let logs = spreadsheet.getSheetByName(LOG_SHEET_NAME);
  if (!logs) {
    logs = spreadsheet.insertSheet(LOG_SHEET_NAME);
  }

  logs.clear();
  logs.appendRow([
    'Timestamp',
    'Date',
    'Time',
    'Chat ID',
    'Type',
    'Amount',
    'Unit',
    'Raw Text',
    'Note',
  ]);

  let config = spreadsheet.getSheetByName(CONFIG_SHEET_NAME);
  if (!config) {
    config = spreadsheet.insertSheet(CONFIG_SHEET_NAME);
  }

  if (config.getLastRow() === 0) {
    config.appendRow(['Key', 'Value', 'Note']);
    config.appendRow(['daily_target_cc', '2500', 'Example target. Adjust for your own use case.']);
    config.appendRow(['default_unit', 'cc', 'Default drink amount unit.']);
  }
}

function setWebhook(webAppUrl) {
  const token = getRequiredProperty('BOT_TOKEN');
  const url = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webAppUrl)}`;
  const response = UrlFetchApp.fetch(url);
  Logger.log(response.getContentText());
}

function sendDrinkReminder() {
  const chatId = getRequiredProperty('DEFAULT_CHAT_ID');
  sendTelegramMessage(chatId, 'Time to drink water. Reply with: water 250');
}

function appendLog(chatId, type, amount, unit, rawText, note) {
  const spreadsheet = SpreadsheetApp.openById(getRequiredProperty('SHEET_ID'));
  const sheet = spreadsheet.getSheetByName(LOG_SHEET_NAME);

  if (!sheet) {
    throw new Error(`Missing sheet: ${LOG_SHEET_NAME}. Run setupSheets() first.`);
  }

  const now = new Date();
  sheet.appendRow([
    now,
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    Utilities.formatDate(now, Session.getScriptTimeZone(), 'HH:mm:ss'),
    chatId,
    type,
    amount,
    unit,
    rawText,
    note,
  ]);
}

function parseDrinkMessage(text) {
  const normalized = text.toLowerCase();
  const amountMatch = normalized.match(/(?:water\s*)?(\d{2,4})\s*(cc|ml)?/);

  if (amountMatch) {
    return {
      type: 'water',
      amount: Number(amountMatch[1]),
      unit: amountMatch[2] || 'cc',
      note: '',
    };
  }

  return {
    type: 'note',
    amount: '',
    unit: '',
    note: text,
  };
}

function sendTelegramMessage(chatId, text) {
  const token = getRequiredProperty('BOT_TOKEN');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

function getRequiredProperty(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) {
    throw new Error(`Missing script property: ${name}`);
  }
  return value;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
