import { Day, DayConfig, CourtLocation } from "./types";

/**
 * Normalizes time strings for consistent comparison
 * Example: "12 PM" → "12pm", " 1pm " → "1pm"
 */
export function normalizeTime(timeStr: string): string {
  return timeStr.toLowerCase().replace(/\s+/g, "");
}

/**
 * Builds the booking URL for a location and date
 */
export function buildBookingUrl(location: CourtLocation, dateStr: string): string {
  return `${location.baseUrl}/book/courts/${location.path}/${dateStr}`;
}

/**
 * Extracts available court slots from HTML content
 */
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