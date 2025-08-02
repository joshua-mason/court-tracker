import { Day } from './types';

export interface StoreState {
  lastResultsHash: string;
  lastNotificationTime: number;
}

const STORE_KEY = 'courtTrackerState';

/**
 * Generates a hash of the current results for change detection
 */
export function generateResultsHash(results: Day[]): string {
  if (results.length === 0) {
    return 'empty';
  }

  // Create a consistent string representation of results
  const sorted = results
    .map((r) => `${r.locationName}|${r.dateLabel}|${r.time}|${r.courtName}`)
    .sort()
    .join('||');

  // Use GAS built-in MD5 digest
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sorted);
  return bytes.map((byte) => (byte + 256).toString(16).substr(-2)).join('');
}

/**
 * Load the current state from PropertiesService
 */
export function loadState(): StoreState {
  const stored = PropertiesService.getScriptProperties().getProperty(STORE_KEY);

  if (!stored) {
    return {
      lastResultsHash: '',
      lastNotificationTime: 0,
    };
  }

  try {
    return JSON.parse(stored);
  } catch (e) {
    Logger.log(`Warning: Failed to parse stored state: ${e}`);
    return {
      lastResultsHash: '',
      lastNotificationTime: 0,
    };
  }
}

/**
 * Save the current state to PropertiesService
 */
export function saveState(state: StoreState): void {
  try {
    PropertiesService.getScriptProperties().setProperty(
      STORE_KEY,
      JSON.stringify(state)
    );
    Logger.log(`State saved: hash=${state.lastResultsHash.substr(0, 8)}...`);
  } catch (e) {
    Logger.log(`Error saving state: ${e}`);
  }
}

/**
 * Check if results have changed since last run
 */
export function hasResultsChanged(currentResults: Day[]): boolean {
  const currentHash = generateResultsHash(currentResults);
  const state = loadState();

  const changed = currentHash !== state.lastResultsHash;

  Logger.log(
    `Results comparison: current=${currentHash.substr(0, 8)}... last=${state.lastResultsHash.substr(0, 8)}... changed=${changed}`
  );

  return changed;
}

/**
 * Update state after processing results
 */
export function updateState(
  currentResults: Day[],
  notificationSent: boolean = false
): void {
  const currentHash = generateResultsHash(currentResults);
  const now = new Date().getTime();

  const newState: StoreState = {
    lastResultsHash: currentHash,
    lastNotificationTime: notificationSent
      ? now
      : loadState().lastNotificationTime,
  };

  saveState(newState);
}

/**
 * Get a summary of the current state for debugging
 */
export function getStateSummary(): string {
  const state = loadState();
  const lastNotification =
    state.lastNotificationTime > 0
      ? new Date(state.lastNotificationTime).toISOString()
      : 'never';

  return `State: hash=${state.lastResultsHash.substr(0, 8)}..., lastNotification=${lastNotification}`;
}
