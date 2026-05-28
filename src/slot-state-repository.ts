import { Day } from './types';
import { loadState, saveState } from './state-store';

function generateResultsHash(results: Day[]): string {
  if (results.length === 0) {
    return 'empty';
  }

  const sorted = results
    .map((r) => `${r.locationName}|${r.dateLabel}|${r.time}|${r.courtName}`)
    .sort()
    .join('||');

  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sorted);
  return bytes.map((byte) => (byte + 256).toString(16).slice(-2)).join('');
}

export function hasResultsChanged(currentResults: Day[]): boolean {
  const currentHash = generateResultsHash(currentResults);
  const state = loadState();

  const changed = currentHash !== state.lastResultsHash;

  Logger.log(
    `Results comparison: current=${currentHash.substring(0, 8)}... last=${state.lastResultsHash.substring(0, 8)}... changed=${changed}`
  );

  return changed;
}

export function updateState(
  currentResults: Day[],
  notificationSent: boolean = false
): void {
  const currentHash = generateResultsHash(currentResults);
  const now = new Date().getTime();

  const currentState = loadState();
  saveState({
    ...currentState,
    lastResultsHash: currentHash,
    lastNotificationTime: notificationSent
      ? now
      : currentState.lastNotificationTime,
  });
}

export function getStateSummary(): string {
  const state = loadState();
  const lastNotification =
    state.lastNotificationTime > 0
      ? new Date(state.lastNotificationTime).toISOString()
      : 'never';

  return `State: hash=${state.lastResultsHash.substring(0, 8)}..., lastNotification=${lastNotification}`;
}
