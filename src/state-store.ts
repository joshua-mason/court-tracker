import { CourtCheckError, Day } from './types';

export interface StoreState {
  lastNotifiedSnapshots: Record<string, Day[]>;
  lastNotificationTime: number;
  lastCheckedAt: Record<string, number>;
  storedErrors: Array<{
    errorLabel: string;
    error: CourtCheckError;
    timestamp: number;
  }>;
  lastErrorSummaryTime: number;
  lastFailureAlertTime: number;
}

const STORE_KEY = 'courtTrackerState';

export function loadState(): StoreState {
  const stored = PropertiesService.getScriptProperties().getProperty(STORE_KEY);

  if (!stored) {
    return cloneDefault();
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      lastNotifiedSnapshots: parsed.lastNotifiedSnapshots || {},
      lastNotificationTime: parsed.lastNotificationTime || 0,
      lastCheckedAt: parsed.lastCheckedAt || {},
      storedErrors: parsed.storedErrors || [],
      lastErrorSummaryTime: parsed.lastErrorSummaryTime || 0,
      lastFailureAlertTime: parsed.lastFailureAlertTime || 0,
    };
  } catch (e) {
    Logger.log(`Warning: Failed to parse stored state: ${e}`);
    return cloneDefault();
  }
}

export function saveState(state: StoreState): void {
  try {
    PropertiesService.getScriptProperties().setProperty(
      STORE_KEY,
      JSON.stringify(state)
    );
    const snapshotCount = Object.keys(state.lastNotifiedSnapshots).length;
    Logger.log(`State saved: ${snapshotCount} snapshot key(s)`);
  } catch (e) {
    Logger.log(`Error saving state: ${e}`);
  }
}

function cloneDefault(): StoreState {
  return {
    lastNotifiedSnapshots: {},
    lastNotificationTime: 0,
    lastCheckedAt: {},
    storedErrors: [],
    lastErrorSummaryTime: 0,
    lastFailureAlertTime: 0,
  };
}
