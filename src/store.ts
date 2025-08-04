import { Day, CourtCheckError } from './types';

export interface StoreState {
  lastResultsHash: string;
  lastNotificationTime: number;
  storedErrors: Array<{
    errorLabel: string;
    error: CourtCheckError;
    timestamp: number;
  }>;
  lastErrorSummaryTime: number;
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
  return bytes.map((byte) => (byte + 256).toString(16).slice(-2)).join('');
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
      storedErrors: [],
      lastErrorSummaryTime: 0,
    };
  }

  try {
    const parsed = JSON.parse(stored);

    // Migration: handle old state format without new fields
    return {
      lastResultsHash: parsed.lastResultsHash || '',
      lastNotificationTime: parsed.lastNotificationTime || 0,
      storedErrors: parsed.storedErrors || [],
      lastErrorSummaryTime: parsed.lastErrorSummaryTime || 0,
    };
  } catch (e) {
    Logger.log(`Warning: Failed to parse stored state: ${e}`);
    return {
      lastResultsHash: '',
      lastNotificationTime: 0,
      storedErrors: [],
      lastErrorSummaryTime: 0,
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
    Logger.log(`State saved: hash=${state.lastResultsHash.substring(0, 8)}...`);
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
    `Results comparison: current=${currentHash.substring(0, 8)}... last=${state.lastResultsHash.substring(0, 8)}... changed=${changed}`
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

  const currentState = loadState();
  const newState: StoreState = {
    lastResultsHash: currentHash,
    lastNotificationTime: notificationSent
      ? now
      : currentState.lastNotificationTime,
    storedErrors: currentState.storedErrors,
    lastErrorSummaryTime: currentState.lastErrorSummaryTime,
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

  return `State: hash=${state.lastResultsHash.substring(0, 8)}..., lastNotification=${lastNotification}`;
}

/**
 * Add errors to the stored error list
 */
export function storeErrors(
  errors: Array<{ errorLabel: string; error: CourtCheckError }>
): void {
  const state = loadState();
  const now = Date.now();

  const newErrors = errors.map((e) => ({
    ...e,
    timestamp: now,
  }));

  state.storedErrors.push(...newErrors);
  saveState(state);

  Logger.log(`Stored ${errors.length} errors for weekly summary`);
}

/**
 * Check if we should send weekly error summary (once per week)
 */
export function shouldSendErrorSummary(): boolean {
  const state = loadState();
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  return (
    now - state.lastErrorSummaryTime >= oneWeek && state.storedErrors.length > 0
  );
}

/**
 * Get stored errors and clear them (for weekly summary)
 */
export function getAndClearStoredErrors(): Array<{
  errorLabel: string;
  error: CourtCheckError;
  timestamp: number;
}> {
  const state = loadState();
  const errors = [...state.storedErrors];

  state.storedErrors = [];
  state.lastErrorSummaryTime = Date.now();
  saveState(state);

  return errors;
}
