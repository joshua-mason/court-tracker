import { CourtCheckError } from './types';
import { loadState, saveState } from './state-store';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

export function shouldSendErrorSummary(): boolean {
  const state = loadState();
  const now = Date.now();

  return (
    now - state.lastErrorSummaryTime >= ONE_WEEK_MS &&
    state.storedErrors.length > 0
  );
}

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
