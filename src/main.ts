import { COURT_LOCATIONS, LOCATION_SCHEDULES } from './config';
import { CourtCheckError, CourtLocation, DayConfig } from './types';
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
  cadenceKey,
  isDue,
  markChecked,
  DEFAULT_CHECK_EVERY_HOURS,
  SnapshotMap,
} from './slot-state-repository';
import {
  storeErrors,
  shouldSendErrorSummary,
  getAndClearStoredErrors,
} from './error-queue-repository';
import { generateHtmlEmail } from './html-renderer';

interface ScheduleEntry {
  location: CourtLocation;
  dayConfig: DayConfig;
  cadenceKey: string;
}

type ErrorEntry = { errorLabel: string; error: CourtCheckError };

export function checkCourtAvailability() {
  const now = new Date();
  const nowMs = now.getTime();
  const tz = Session.getScriptTimeZone();
  const todayIso = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  const errors: ErrorEntry[] = [];

  // Carry-forward: start from the prior baseline so tuples we skip or fail to
  // fetch this tick keep their last-known slots.
  const previousSnapshots = getLastNotifiedSnapshots(todayIso);
  const currentSnapshots: SnapshotMap = { ...previousSnapshots };

  const entries = buildScheduleEntries();
  const { due, notDue } = partitionByDue(entries, nowMs);

  Logger.log(`Cadence: ${due.length} due, ${notDue.length} skipped this tick`);

  const fetchedKeys = new Set<string>();
  fetchEntries(due, now, tz, currentSnapshots, errors, fetchedKeys);

  Logger.log(`${getStateSummary()}`);

  let { added, removed, allCurrent } = diff(
    currentSnapshots,
    previousSnapshots
  );
  let hasChanges = added.length > 0 || removed.length > 0;

  // Refresh-all-on-change: if a due check revealed a change, fetch the rest
  // so the email reflects all-fresh data rather than mixing fresh + cached.
  if (hasChanges && notDue.length > 0) {
    Logger.log(
      `🔁 Change detected — refreshing ${notDue.length} skipped schedules`
    );
    fetchEntries(notDue, now, tz, currentSnapshots, errors, fetchedKeys);
    ({ added, removed, allCurrent } = diff(
      currentSnapshots,
      previousSnapshots
    ));
    hasChanges = added.length > 0 || removed.length > 0;
  }

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

  if (fetchedKeys.size > 0) {
    markChecked(Array.from(fetchedKeys), nowMs);
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

function buildScheduleEntries(): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  for (const schedule of LOCATION_SCHEDULES) {
    const location = COURT_LOCATIONS.find(
      (loc) => loc.id === schedule.locationId
    );
    if (!location) {
      Logger.log(
        `Warning: Location ${schedule.locationId} not found in COURT_LOCATIONS`
      );
      continue;
    }
    for (const dayConfig of schedule.watchDays) {
      entries.push({
        location,
        dayConfig,
        cadenceKey: cadenceKey(location.id, dayConfig.day),
      });
    }
  }
  return entries;
}

function partitionByDue(
  entries: ScheduleEntry[],
  nowMs: number
): { due: ScheduleEntry[]; notDue: ScheduleEntry[] } {
  const due: ScheduleEntry[] = [];
  const notDue: ScheduleEntry[] = [];
  for (const entry of entries) {
    const interval =
      entry.dayConfig.checkEveryHours ?? DEFAULT_CHECK_EVERY_HOURS;
    if (isDue(entry.cadenceKey, interval, nowMs)) {
      due.push(entry);
    } else {
      notDue.push(entry);
    }
  }
  return { due, notDue };
}

function fetchEntries(
  entries: ScheduleEntry[],
  now: Date,
  tz: string,
  currentSnapshots: SnapshotMap,
  errors: ErrorEntry[],
  fetchedKeys: Set<string>
): void {
  for (const entry of entries) {
    const datesToCheck = datesForEntry(entry.dayConfig, now);
    let anySuccess = false;
    for (const targetDate of datesToCheck) {
      const dateStr = Utilities.formatDate(targetDate, tz, 'yyyy-MM-dd');
      const url = buildBookingUrl(entry.location, dateStr);

      Logger.log(
        `Checking ${entry.location.name} - ${entry.dayConfig.day} (${dateStr}) at ${url}`
      );

      const htmlResult = fetchHtml(url, entry.location.name);

      if (!htmlResult.success) {
        const errorLabel = `${entry.location.name} - ${entry.dayConfig.day} (${dateStr})`;
        errors.push({ errorLabel, error: htmlResult.error });
        Logger.log(
          `Error checking ${errorLabel}: ${htmlResult.error.type} - ${htmlResult.error.message}`
        );
        continue;
      }

      const slots = extractAvailableSlots(
        htmlResult.data,
        entry.location,
        entry.dayConfig,
        dateStr
      );
      currentSnapshots[
        makeKey(entry.location.id, entry.dayConfig.day, dateStr)
      ] = slots;
      anySuccess = true;
    }
    if (anySuccess) fetchedKeys.add(entry.cadenceKey);
  }
}

function datesForEntry(dayConfig: DayConfig, now: Date): Date[] {
  const dates: Date[] = [];
  const nextWeekDate = getNextDateForDay(dayConfig.day, now);
  if (nextWeekDate.toDateString() === now.toDateString()) {
    dates.push(nextWeekDate);
    const actualNextWeek = new Date(nextWeekDate);
    actualNextWeek.setDate(actualNextWeek.getDate() + 7);
    dates.push(actualNextWeek);
  } else {
    dates.push(nextWeekDate);
  }
  return dates;
}

export { generateHtmlEmail };
