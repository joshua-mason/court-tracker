import { COURT_LOCATIONS, LOCATION_SCHEDULES } from "./config";
import { Day, CourtCheckError } from "./types";
import { getAvailabilityForDay } from "./court-service";
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
      const result = getAvailabilityForDay(location, dayConfig, now, tz);
      
      if (result.success) {
        allMatches.push(...result.data);
      } else {
        // Collect error instead of sending immediately
        const errorLabel = `${location.name} - ${dayConfig.label}`;
        errors.push({ errorLabel, error: result.error });
        Logger.log(`Error checking ${errorLabel}: ${result.error.type} - ${result.error.message}`);
      }
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
