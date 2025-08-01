import { CONFIG } from "./config";
import { Day, DayConfig, Result, CourtCheckError } from "./types";

export function getAvailabilityForDay(dayConfig: DayConfig, now: Date, tz: string): Result<Day[], CourtCheckError> {
  const targetDate = getNextDateForWeekday(dayConfig.weekdayIndex, now);

  const dateStr = Utilities.formatDate(targetDate, tz, "yyyy-MM-dd");
  const url = `https://tennistowerhamlets.com/book/courts/${CONFIG.courtPath}/${dateStr}`;

  Logger.log(`Checking ${dayConfig.label} (${dateStr}) at ${url}`);

  let html: string;
  try {
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
    });
    
    if (resp.getResponseCode() !== 200) {
      return {
        success: false,
        error: {
          type: 'http_error',
          message: `HTTP ${resp.getResponseCode()}`,
          url,
          statusCode: resp.getResponseCode()
        }
      };
    }
    
    html = resp.getContentText();
  } catch (e) {
    Logger.log("Fetch error: " + e);
    return {
      success: false,
      error: {
        type: 'fetch_error',
        message: String(e),
        url
      }
    };
  }

  if (!/<tr>/.test(html)) {
    return {
      success: false,
      error: {
        type: 'html_parse_error',
        message: 'No <tr> elements found - possible HTML structure change',
        url
      }
    };
  }

  if (html.length < 5000) {
    Logger.log("⚠️ Warning: Fetched HTML unusually short");
  }

  const slots = extractAvailableSlots(html, dayConfig, dateStr);
  
  return {
    success: true,
    data: slots
  };
}

function getNextDateForWeekday(targetWeekday: number, fromDate: Date): Date {
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  let delta = (targetWeekday - currentDay + 7) % 7;
  if (delta === 0) delta = 7; // always move forward at least 1 week
  date.setDate(date.getDate() + delta);
  return date;
}

function extractAvailableSlots(
  html: string,
  dayConfig: DayConfig,
  dateStr: string
): Day[] {
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