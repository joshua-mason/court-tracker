import { CourtCheckError } from './types';

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

const DEFAULT_STATE: StoreState = {
  lastResultsHash: '',
  lastNotificationTime: 0,
  storedErrors: [],
  lastErrorSummaryTime: 0,
};

export function loadState(): StoreState {
  const stored = PropertiesService.getScriptProperties().getProperty(STORE_KEY);

  if (!stored) {
    return { ...DEFAULT_STATE };
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      lastResultsHash: parsed.lastResultsHash || '',
      lastNotificationTime: parsed.lastNotificationTime || 0,
      storedErrors: parsed.storedErrors || [],
      lastErrorSummaryTime: parsed.lastErrorSummaryTime || 0,
    };
  } catch (e) {
    Logger.log(`Warning: Failed to parse stored state: ${e}`);
    return { ...DEFAULT_STATE };
  }
}

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
