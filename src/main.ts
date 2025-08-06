import { COURT_LOCATIONS, LOCATION_SCHEDULES } from './config';
import { Day, CourtCheckError } from './types';
import { getNextDateForDay } from './utils';
import { buildBookingUrl, extractAvailableSlots } from './html-parser';
import { fetchHtml } from './http-client';
import {
  sendNotificationEmail,
  sendWeeklyErrorSummaryNotification,
} from './notification';
import {
  hasResultsChanged,
  updateState,
  getStateSummary,
  storeErrors,
  shouldSendErrorSummary,
  getAndClearStoredErrors,
} from './store';
import { generateHtmlEmail } from './html-renderer';

// Entry point for the hourly trigger
export function checkCourtAvailability() {
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const allMatches: Day[] = [];
  const errors: Array<{ errorLabel: string; error: CourtCheckError }> = [];

  // Process each location and its schedule
  LOCATION_SCHEDULES.forEach((schedule) => {
    const location = COURT_LOCATIONS.find(
      (loc) => loc.id === schedule.locationId
    );

    if (!location) {
      Logger.log(
        `Warning: Location ${schedule.locationId} not found in COURT_LOCATIONS`
      );
      return;
    }

    schedule.watchDays.forEach((dayConfig) => {
      // Generate dates to check: today (if matches) + next week's occurrence
      const datesToCheck: Date[] = [];

      // Always check next week's occurrence
      const nextWeekDate = getNextDateForDay(dayConfig.day, now);
      if (nextWeekDate.toDateString() === now.toDateString()) {
        // If "next" date is today, also check next week
        datesToCheck.push(nextWeekDate); // Today
        const actualNextWeek = new Date(nextWeekDate);
        actualNextWeek.setDate(actualNextWeek.getDate() + 7);
        datesToCheck.push(actualNextWeek); // Next week
      } else {
        // Normal case - just next occurrence
        datesToCheck.push(nextWeekDate);
      }

      datesToCheck.forEach((targetDate) => {
        // Step 1: Calculate date and build URL
        const dateStr = Utilities.formatDate(targetDate, tz, 'yyyy-MM-dd');
        const url = buildBookingUrl(location, dateStr);

        Logger.log(
          `Checking ${location.name} - ${dayConfig.day} (${dateStr}) at ${url}`
        );

        // Step 2: Fetch HTML
        const htmlResult = fetchHtml(url, location.name);

        if (!htmlResult.success) {
          const errorLabel = `${location.name} - ${dayConfig.day} (${dateStr})`;
          errors.push({ errorLabel, error: htmlResult.error });
          Logger.log(
            `Error checking ${errorLabel}: ${htmlResult.error.type} - ${htmlResult.error.message}`
          );
          return;
        }

        // Step 3: Parse HTML to extract available slots
        const slots = extractAvailableSlots(
          htmlResult.data,
          location,
          dayConfig,
          dateStr
        );
        allMatches.push(...slots);
      });
    });
  });

  // Log current state for debugging
  Logger.log(`${getStateSummary()}`);

  // Check if results have changed and send notifications accordingly
  const resultsChanged = hasResultsChanged(allMatches);
  let notificationSent = false;

  if (allMatches.length > 0 && resultsChanged) {
    sendNotificationEmail(allMatches);
    notificationSent = true;
    Logger.log('✅ Notification sent - results changed');
  } else if (allMatches.length > 0 && !resultsChanged) {
    Logger.log('🔄 Slots found but unchanged - no notification sent');
  } else {
    Logger.log('❌ No matching slots found for any configured location/day');
  }

  // Update state with current results (but only if not all requests failed)
  const allRequestsFailed = errors.length > 0 && allMatches.length === 0;
  if (!allRequestsFailed) {
    updateState(allMatches, notificationSent);
  } else {
    Logger.log(
      '⚠️ All requests failed - skipping state update to preserve last known state'
    );
  }

  // Store errors for weekly summary instead of sending immediately
  if (errors.length > 0) {
    storeErrors(errors);
    Logger.log(`Stored ${errors.length} errors for weekly summary`);
  }

  // Check if we should send weekly error summary
  if (shouldSendErrorSummary()) {
    const storedErrors = getAndClearStoredErrors();
    Logger.log(
      `Sending weekly error summary with ${storedErrors.length} total errors`
    );

    // Send weekly error summary with timestamps
    sendWeeklyErrorSummaryNotification(storedErrors, now, tz);
  }
}

// Export for preview script
export { generateHtmlEmail };
