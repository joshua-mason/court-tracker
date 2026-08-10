import { CourtCheckError } from './types';
import { loadState, saveState } from './state-store';

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

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

/**
 * A total fetch failure means we cannot know whether slots changed, so the
 * normal "no changes" path would stay silent indefinitely. Alert instead —
 * throttled to once a day so a prolonged outage does not mail every tick.
 */
export function shouldSendFailureAlert(now: number): boolean {
  return now - loadState().lastFailureAlertTime >= ONE_DAY_MS;
}

export function markFailureAlertSent(now: number): void {
  const state = loadState();
  saveState({ ...state, lastFailureAlertTime: now });
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
