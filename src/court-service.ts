import { Day, DayConfig, Result, CourtCheckError, CourtLocation } from "./types";

export function getAvailabilityForDay(
  location: CourtLocation, 
  dayConfig: DayConfig, 
  now: Date, 
  tz: string
): Result<Day[], CourtCheckError> {
  const targetDate = getNextDateForDay(dayConfig.day, now);
  const dateStr = Utilities.formatDate(targetDate, tz, "yyyy-MM-dd");
  const url = `${location.baseUrl}/book/courts/${location.path}/${dateStr}`;

  Logger.log(`Checking ${location.name} - ${dayConfig.day} (${dateStr}) at ${url}`);

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
          statusCode: resp.getResponseCode(),
          locationName: location.name
        }
      };
    }
    
    html = resp.getContentText();
  } catch (e) {
    Logger.log(`Fetch error for ${location.name}: ${e}`);
    return {
      success: false,
      error: {
        type: 'fetch_error',
        message: String(e),
        url,
        locationName: location.name
      }
    };
  }

  if (!/<tr>/.test(html)) {
    return {
      success: false,
      error: {
        type: 'html_parse_error',
        message: 'No <tr> elements found - possible HTML structure change',
        url,
        locationName: location.name
      }
    };
  }

  if (html.length < 5000) {
    Logger.log("⚠️ Warning: Fetched HTML unusually short");
  }

  const slots = extractAvailableSlots(html, location, dayConfig, dateStr);
  
  return {
    success: true,
    data: slots
  };
}

/**
 * Gets the next occurrence of a specific day of the week
 * Always returns a future date (never today, even if it matches)
 * 
 * Examples:
 * - If today is Tuesday and you ask for "wednesday", returns tomorrow
 * - If today is Tuesday and you ask for "tuesday", returns next Tuesday (in 7 days)
 */
export function getNextDateForDay(targetDay: string, fromDate: Date): Date {
  // JavaScript weekday indexes: Sunday=0, Monday=1, Tuesday=2, etc.
  const dayToIndex: Record<string, number> = {
    'sunday': 0,
    'monday': 1, 
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6
  };
  
  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const targetWeekday = dayToIndex[targetDay];
  
  let delta = (targetWeekday - currentDay + 7) % 7;
  if (delta === 0) delta = 7; // Always move forward at least 1 week
  
  date.setDate(date.getDate() + delta);
  return date;
}

export function extractAvailableSlots(
  html: string,
  location: CourtLocation,
  dayConfig: DayConfig,
  dateStr: string
): Day[] {
  const targetHours = dayConfig.hours.map(normalizeTime);
  const matches: Day[] = [];

  Logger.log(
    `--- Parsing availability for ${location.name} - ${dayConfig.day} (${dateStr}) ---`
  );
  Logger.log(`Target hours: ${targetHours.join(", ")}`);

  const rowRegex = new RegExp(location.htmlSelectors.timeRowRegex, 'gi');
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

    const slotsForTime = checkCourtsAtTime(
      location, 
      dayConfig, 
      dateStr, 
      timeLabel, 
      tdContent
    );
    matches.push(...slotsForTime);
  }

  Logger.log(`Finished parsing: ${matches.length} matching slot(s) found\n`);
  return matches;
}

/**
 * Normalizes time strings for consistent comparison
 * Example: "12 PM" → "12pm", " 1pm " → "1pm"
 */
export function normalizeTime(timeStr: string): string {
  return timeStr.toLowerCase().replace(/\s+/g, "");
}

/**
 * Checks all courts at a location for availability at a specific time
 */
export function checkCourtsAtTime(
  location: CourtLocation,
  dayConfig: DayConfig, 
  dateStr: string,
  timeLabel: string,
  tdContent: string
): Day[] {
  const matches: Day[] = [];
  
  for (const court of location.courts) {
    const isAvailable = 
      tdContent.includes(location.htmlSelectors.availableButtonSelector) && 
      tdContent.includes(court.name);

    if (isAvailable) {
      matches.push({
        dateLabel: `${dayConfig.day} (${dateStr})`,
        time: timeLabel,
        url: buildBookingUrl(location, dateStr),
        locationName: location.name,
        courtName: court.displayName,
      });
      Logger.log(`✅ Match: ${court.displayName} at ${timeLabel}`);
    } else {
      Logger.log(`❌ No available ${court.displayName} at ${timeLabel}`);
    }
  }
  
  return matches;
}

/**
 * Builds the booking URL for a location and date
 */
export function buildBookingUrl(location: CourtLocation, dateStr: string): string {
  return `${location.baseUrl}/book/courts/${location.path}/${dateStr}`;
}