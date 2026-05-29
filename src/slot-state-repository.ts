import { Day } from './types';
import { loadState, saveState } from './state-store';

export type SnapshotKey = string;
export type SnapshotMap = Record<SnapshotKey, Day[]>;
export type CadenceKey = string;

export interface SnapshotDiff {
  added: Day[];
  removed: Day[];
  allCurrent: Day[];
}

export function makeKey(
  locationId: string,
  dayOfWeek: string,
  date: string
): SnapshotKey {
  return `${locationId}::${dayOfWeek}::${date}`;
}

export function cadenceKey(locationId: string, dayOfWeek: string): CadenceKey {
  return `${locationId}::${dayOfWeek}`;
}

export function isDue(
  key: CadenceKey,
  checkEveryHours: number,
  now: number
): boolean {
  if (checkEveryHours <= 0) return true;
  const lastCheckedAt = loadState().lastCheckedAt[key];
  if (!lastCheckedAt) return true;
  const intervalMs = checkEveryHours * 60 * 60 * 1000;
  return now - lastCheckedAt >= intervalMs;
}

export function markChecked(keys: CadenceKey[], now: number): void {
  if (keys.length === 0) return;
  const state = loadState();
  const updated = { ...state.lastCheckedAt };
  for (const key of keys) {
    updated[key] = now;
  }
  saveState({ ...state, lastCheckedAt: updated });
}

export function getLastNotifiedSnapshots(todayIso: string): SnapshotMap {
  return pruneToFutureDates(loadState().lastNotifiedSnapshots, todayIso);
}

export function diff(
  currentSnapshots: SnapshotMap,
  previous: SnapshotMap
): SnapshotDiff {
  const added: Day[] = [];
  const removed: Day[] = [];
  const allCurrent: Day[] = [];

  const allKeys = new Set([
    ...Object.keys(currentSnapshots),
    ...Object.keys(previous),
  ]);

  for (const key of allKeys) {
    const currentSlots = currentSnapshots[key] || [];
    const previousSlots = previous[key] || [];
    const currentIds = new Set(currentSlots.map(slotId));
    const previousIds = new Set(previousSlots.map(slotId));

    currentSlots.forEach((slot) => {
      allCurrent.push(slot);
      if (!previousIds.has(slotId(slot))) added.push(slot);
    });

    previousSlots.forEach((slot) => {
      if (!currentIds.has(slotId(slot))) removed.push(slot);
    });
  }

  return { added, removed, allCurrent };
}

export function commitAsNotified(
  currentSnapshots: SnapshotMap,
  todayIso: string
): void {
  const pruned = pruneToFutureDates(currentSnapshots, todayIso);
  const state = loadState();
  saveState({
    ...state,
    lastNotifiedSnapshots: pruned,
    lastNotificationTime: Date.now(),
  });
}

/** Number of hours between checks when a schedule omits checkEveryHours. */
export const DEFAULT_CHECK_EVERY_HOURS = 1;

export function getStateSummary(): string {
  const state = loadState();
  const lastNotification =
    state.lastNotificationTime > 0
      ? new Date(state.lastNotificationTime).toISOString()
      : 'never';
  const snapshotCount = Object.keys(state.lastNotifiedSnapshots).length;

  return `State: ${snapshotCount} snapshot key(s), lastNotification=${lastNotification}`;
}

function slotId(slot: Day): string {
  return `${slot.locationName}|${slot.dateLabel}|${slot.time}|${slot.courtName}`;
}

function pruneToFutureDates(
  snapshots: SnapshotMap,
  todayIso: string
): SnapshotMap {
  const result: SnapshotMap = {};
  for (const [key, slots] of Object.entries(snapshots)) {
    const date = extractDateFromKey(key);
    if (date && date >= todayIso) {
      result[key] = slots;
    }
  }
  return result;
}

function extractDateFromKey(key: SnapshotKey): string | null {
  const parts = key.split('::');
  return parts.length === 3 ? parts[2] : null;
}
