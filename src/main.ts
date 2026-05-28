import { COURT_LOCATIONS, LOCATION_SCHEDULES } from './config';
import { CourtCheckError } from './types';
import { getNextDateForDay } from './utils';
import { buildBookingUrl, extractAvailableSlots } from './html-parser';
import { fetchHtml } from './http-client';
import {
  sendNotificationEmail,
  sendWeeklyErrorSummaryNotification,
} from './notification';
import {
  makeKey,
  diff,
  commitAsNotified,
  getLastNotifiedSnapshots,
  getStateSummary,
  SnapshotMap,
} from './slot-state-repository';
import {
  storeErrors,
  shouldSendErrorSummary,
  getAndClearStoredErrors,
} from './error-queue-repository';
import { generateHtmlEmail } from './html-renderer';

// Entry point for the hourly trigger
export function checkCourtAvailability() {
  const now = new Date();
  const tz = Session.getScriptTimeZone();
  const todayIso = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const errors: Array<{ errorLabel: string; error: CourtCheckError }> = [];

  // Carry-forward semantics: start from the prior baseline so any tuples we
  // fail to fetch this tick keep their last-known slots and don't get reported
  // as "removed".
  const previousSnapshots = getLastNotifiedSnapshots(todayIso);
  const currentSnapshots: SnapshotMap = { ...previousSnapshots };

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
      const datesToCheck: Date[] = [];

      const nextWeekDate = getNextDateForDay(dayConfig.day, now);
      if (nextWeekDate.toDateString() === now.toDateString()) {
        datesToCheck.push(nextWeekDate);
        const actualNextWeek = new Date(nextWeekDate);
        actualNextWeek.setDate(actualNextWeek.getDate() + 7);
        datesToCheck.push(actualNextWeek);
      } else {
        datesToCheck.push(nextWeekDate);
      }

      datesToCheck.forEach((targetDate) => {
        const dateStr = Utilities.formatDate(targetDate, tz, 'yyyy-MM-dd');
        const url = buildBookingUrl(location, dateStr);

        Logger.log(
          `Checking ${location.name} - ${dayConfig.day} (${dateStr}) at ${url}`
        );

        const htmlResult = fetchHtml(url, location.name);

        if (!htmlResult.success) {
          const errorLabel = `${location.name} - ${dayConfig.day} (${dateStr})`;
          errors.push({ errorLabel, error: htmlResult.error });
          Logger.log(
            `Error checking ${errorLabel}: ${htmlResult.error.type} - ${htmlResult.error.message}`
          );
          return;
        }

        const slots = extractAvailableSlots(
          htmlResult.data,
          location,
          dayConfig,
          dateStr
        );
        const key = makeKey(location.id, dayConfig.day, dateStr);
        currentSnapshots[key] = slots;
      });
    });
  });

  Logger.log(`${getStateSummary()}`);

  const { added, removed, allCurrent } = diff(
    currentSnapshots,
    previousSnapshots
  );

  const hasChanges = added.length > 0 || removed.length > 0;
  if (hasChanges && allCurrent.length > 0) {
    sendNotificationEmail(allCurrent);
    commitAsNotified(currentSnapshots, todayIso);
    Logger.log(
      `✅ Notification sent — ${added.length} added, ${removed.length} removed`
    );
  } else if (hasChanges) {
    Logger.log(
      `🔇 Changes detected (${removed.length} removed) but no current slots — skipping email`
    );
  } else {
    Logger.log('🔄 No changes since last notification');
  }

  if (errors.length > 0) {
    storeErrors(errors);
    Logger.log(`Stored ${errors.length} errors for weekly summary`);
  }

  if (shouldSendErrorSummary()) {
    const storedErrors = getAndClearStoredErrors();
    Logger.log(
      `Sending weekly error summary with ${storedErrors.length} total errors`
    );

    sendWeeklyErrorSummaryNotification(storedErrors, now, tz);
  }
}

export { generateHtmlEmail };
