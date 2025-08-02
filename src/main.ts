import { COURT_LOCATIONS, LOCATION_SCHEDULES } from "./config";
import { Day, CourtCheckError } from "./types";
import { getNextDateForDay } from "./utils";
import { buildBookingUrl, extractAvailableSlots } from "./html-parser";
import { fetchHtml } from "./http-client";
import { sendNotificationEmail, sendErrorSummaryNotification } from "./notification";

// Entry point for the hourly trigger
export function checkCourtAvailability() {
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const allMatches: Day[] = [];
  const errors: Array<{ errorLabel: string; error: CourtCheckError }> = [];

  // Process each location and its schedule
  LOCATION_SCHEDULES.forEach((schedule) => {
    const location = COURT_LOCATIONS.find(loc => loc.id === schedule.locationId);
    
    if (!location) {
      Logger.log(`Warning: Location ${schedule.locationId} not found in COURT_LOCATIONS`);
      return;
    }

    schedule.watchDays.forEach((dayConfig) => {
      // Step 1: Calculate date and build URL
      const targetDate = getNextDateForDay(dayConfig.day, now);
      const dateStr = Utilities.formatDate(targetDate, tz, "yyyy-MM-dd");
      const url = buildBookingUrl(location, dateStr);
      
      Logger.log(`Checking ${location.name} - ${dayConfig.day} (${dateStr}) at ${url}`);
      
      // Step 2: Fetch HTML
      const htmlResult = fetchHtml(url, location.name);
      
      if (!htmlResult.success) {
        const errorLabel = `${location.name} - ${dayConfig.day}`;
        errors.push({ errorLabel, error: htmlResult.error });
        Logger.log(`Error checking ${errorLabel}: ${htmlResult.error.type} - ${htmlResult.error.message}`);
        return;
      }
      
      // Step 3: Parse HTML to extract available slots
      const slots = extractAvailableSlots(htmlResult.data, location, dayConfig, dateStr);
      allMatches.push(...slots);
    });
  });

  // Send notifications
  if (allMatches.length > 0) {
    sendNotificationEmail(allMatches, now, tz);
  } else {
    Logger.log("No matching slots found for any configured location/day");
  }

  // Send single error summary if there were any errors
  if (errors.length > 0) {
    sendErrorSummaryNotification(errors, now, tz);
  }
}
