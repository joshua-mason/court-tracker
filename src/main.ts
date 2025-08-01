import { CONFIG } from "./config";

type Day = {
  dateLabel: string;
  time: string;
  url: string;
};

type DayConfig = {
  weekdayIndex: number;
  label: string;
  hours: string[];
};

// Entry point for the hourly trigger
export function checkCourtAvailability() {
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const allMatches: Day[] = [];

  CONFIG.watchDays.forEach((dayConfig) => {
    const matches = getAvailabilityForDay(dayConfig, now, tz);
    allMatches.push(...matches);
  });

  if (allMatches.length > 0) {
    sendNotificationEmail(allMatches, now, tz);
  } else {
    Logger.log("No matching slots found for any configured day");
  }
}

// Builds the full URL and parses available slots for a single day
function getAvailabilityForDay(dayConfig: DayConfig, now: Date, tz: string) {
  const targetDate = getNextDateForWeekday(dayConfig.weekdayIndex, now);

  const dateStr = Utilities.formatDate(targetDate, tz, "yyyy-MM-dd");
  const url = `https://tennistowerhamlets.com/book/courts/${CONFIG.courtPath}/${dateStr}`;

  Logger.log(`Checking ${dayConfig.label} (${dateStr}) at ${url}`);

  let html;
  try {
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
    });
    if (resp.getResponseCode() !== 200) {
      throw new Error("HTTP " + resp.getResponseCode());
    }
    html = resp.getContentText();
  } catch (e) {
    Logger.log("Fetch error: " + e);
    throw e;
  }

  if (!/<tr>/.test(html)) {
    MailApp.sendEmail(
      CONFIG.notificationEmail,
      "❌ Court‑watch: no <tr> elements found",
      `Possible HTML change:\n\n${url}`
    );
  }

  if (html.length < 5000) {
    Logger.log("⚠️ Warning: Fetched HTML unusually short");
  }

  const avail = extractAvailableSlots(html, dayConfig, dateStr);

  return avail;
}

function getNextDateForWeekday(targetWeekday: number, fromDate: Date) {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  let delta = (targetWeekday - currentDay + 7) % 7;
  if (delta === 0) delta = 7; // always move forward at least 1 week
  date.setDate(date.getDate() + delta);
  return date;
}

// Groups the matches and sends a single notification email
function sendNotificationEmail(allMatches: Day[], now: Date, tz: string) {
  const nowStr = Utilities.formatDate(now, tz, "EEE dd MMM yyyy HH:mm");
  const subject = `🎾 ${allMatches.length} free court slot${allMatches.length > 1 ? "s" : ""} found – ${nowStr}`;
  let body = `The following slots are available:\n\n`;

  const grouped = groupMatchesByDay(allMatches);

  for (const [dateLabel, slots] of Object.entries(grouped)) {
    body += `📅 ${dateLabel}\n`;
    slots.forEach((s: Day) => {
      body += `• ${s.time}\n`;
    });
    body += `→ Book: ${slots[0].url}\n\n`;
  }

  MailApp.sendEmail({
    to: CONFIG.notificationEmail,
    subject,
    body,
  });

  Logger.log(`Sent 1 email with ${allMatches.length} slot(s)`);
}

// Helper to group matches by dateLabel
function groupMatchesByDay(matches: Day[]) {
  const grouped: Record<string, Day[]> = {};
  matches.forEach((m: Day) => {
    if (!grouped[m.dateLabel]) grouped[m.dateLabel] = [];
    grouped[m.dateLabel].push(m);
  });
  return grouped;
}

function extractAvailableSlots(
  html: string,
  dayConfig: DayConfig,
  dateStr: string
) {
  const normalizeTime = (t: string) => t.toLowerCase().replace(/\s+/g, "");
  const targetHours = dayConfig.hours.map(normalizeTime);
  const matches: Day[] = [];

  Logger.log(
    `--- Parsing availability for ${dayConfig.label} (${dateStr}) ---`
  );
  Logger.log(`Target hours: ${targetHours.join(", ")}`);

  const rowRegex =
    /<tr>\s*<th class="time">(.+?)<\/th>\s*<td class="courts">([\s\S]*?)<\/td>\s*<\/tr>/gi;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const timeLabel = rowMatch[1].trim();
    const timeNorm = normalizeTime(timeLabel);
    const tdContent = rowMatch[2];

    Logger.log(`Found time block: "${timeLabel}" → normalized: "${timeNorm}"`);

    if (!targetHours.includes(timeNorm)) {
      Logger.log(`Skipping time ${timeNorm} – not in configured hours`);
      continue;
    }

    const hasAvailableCourt1 =
      tdContent.includes("button available") && tdContent.includes("Court 1");

    if (hasAvailableCourt1) {
      matches.push({
        dateLabel: `${dayConfig.label} (${dateStr})`,
        time: timeLabel,
        url: `https://tennistowerhamlets.com/book/courts/${CONFIG.courtPath}/${dateStr}`,
      });
      Logger.log(`✅ Match: Court 1 at ${timeLabel}`);
    } else {
      Logger.log(`❌ No available Court 1 at ${timeLabel}`);
    }
  }

  Logger.log(`Finished parsing: ${matches.length} matching slot(s) found\n`);
  return matches;
}
