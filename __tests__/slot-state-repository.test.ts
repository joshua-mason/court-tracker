import {
  makeKey,
  diff,
  commitAsNotified,
  getLastNotifiedSnapshots,
  cadenceKey,
  isDue,
  markChecked,
  SnapshotMap,
} from '../src/slot-state-repository';
import { Day } from '../src/types';

const HOUR_MS = 60 * 60 * 1000;

global.PropertiesService = {
  getScriptProperties: jest.fn(() => ({
    getProperty: jest.fn(),
    setProperty: jest.fn(),
    deleteAllProperties: jest.fn(),
    deleteProperty: jest.fn(),
    getKeys: jest.fn(),
    getProperties: jest.fn(),
    setProperties: jest.fn(),
  })),
} as any;

global.Logger = {
  log: jest.fn(),
  clear: jest.fn(),
  getLog: jest.fn(),
};

const TODAY = '2026-05-28';

const slot = (overrides: Partial<Day> = {}): Day => ({
  dateLabel: 'monday (2026-06-01)',
  time: '12 PM',
  url: 'https://example.com/wapping/2026-06-01',
  locationName: 'Wapping',
  courtName: 'Court 1',
  ...overrides,
});

function setupStore(initialState: object | null = null) {
  const mockGetProperty = jest.fn(() =>
    initialState === null ? null : JSON.stringify(initialState)
  );
  const mockSetProperty = jest.fn();
  (global.PropertiesService.getScriptProperties as jest.Mock).mockReturnValue({
    getProperty: mockGetProperty,
    setProperty: mockSetProperty,
  });
  return { mockGetProperty, mockSetProperty };
}

describe('makeKey', () => {
  test('produces a deterministic key from location, day, date', () => {
    expect(makeKey('wapping', 'monday', '2026-06-01')).toBe(
      'wapping::monday::2026-06-01'
    );
  });
});

describe('diff', () => {
  test('reports everything as added when previous is empty', () => {
    const current: SnapshotMap = {
      'wapping::monday::2026-06-01': [slot({ time: '12 PM' })],
    };

    const result = diff(current, {});
    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
    expect(result.allCurrent).toHaveLength(1);
  });

  test('reports no changes when current matches previous', () => {
    const baseline = slot({ time: '12 PM' });

    const result = diff(
      { 'wapping::monday::2026-06-01': [baseline] },
      { 'wapping::monday::2026-06-01': [baseline] }
    );

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.allCurrent).toHaveLength(1);
  });

  test('detects an added slot in a known tuple', () => {
    const result = diff(
      {
        'wapping::monday::2026-06-01': [
          slot({ time: '12 PM' }),
          slot({ time: '1 PM' }),
        ],
      },
      {
        'wapping::monday::2026-06-01': [slot({ time: '12 PM' })],
      }
    );

    expect(result.added).toHaveLength(1);
    expect(result.added[0].time).toBe('1 PM');
    expect(result.removed).toHaveLength(0);
  });

  test('detects a removed slot in a known tuple', () => {
    const result = diff(
      {
        'wapping::monday::2026-06-01': [slot({ time: '12 PM' })],
      },
      {
        'wapping::monday::2026-06-01': [
          slot({ time: '12 PM' }),
          slot({ time: '1 PM' }),
        ],
      }
    );

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].time).toBe('1 PM');
  });

  test('reports removals when a tuple drops to empty', () => {
    const result = diff(
      { 'wapping::monday::2026-06-01': [] },
      { 'wapping::monday::2026-06-01': [slot({ time: '12 PM' })] }
    );

    expect(result.removed).toHaveLength(1);
    expect(result.allCurrent).toHaveLength(0);
  });

  test('reports removals when a tuple disappears entirely', () => {
    const result = diff(
      {},
      { 'wapping::monday::2026-06-01': [slot({ time: '12 PM' })] }
    );

    expect(result.removed).toHaveLength(1);
    expect(result.allCurrent).toHaveLength(0);
  });
});

describe('getLastNotifiedSnapshots', () => {
  test('returns empty map when no state stored (migration path)', () => {
    setupStore(null);
    expect(getLastNotifiedSnapshots(TODAY)).toEqual({});
  });

  test('returns empty map when prior state has no snapshot field', () => {
    setupStore({ lastResultsHash: 'legacy', lastNotificationTime: 0 });
    expect(getLastNotifiedSnapshots(TODAY)).toEqual({});
  });

  test('prunes entries whose date is before today', () => {
    setupStore({
      lastNotifiedSnapshots: {
        'wapping::monday::2025-01-01': [slot({ time: '12 PM' })],
        'wapping::monday::2026-06-01': [slot({ time: '1 PM' })],
      },
    });

    const result = getLastNotifiedSnapshots(TODAY);
    expect(Object.keys(result)).toEqual(['wapping::monday::2026-06-01']);
  });

  test('keeps entries whose date equals today', () => {
    setupStore({
      lastNotifiedSnapshots: {
        [`wapping::monday::${TODAY}`]: [slot({ time: '12 PM' })],
      },
    });

    const result = getLastNotifiedSnapshots(TODAY);
    expect(Object.keys(result)).toEqual([`wapping::monday::${TODAY}`]);
  });
});

describe('commitAsNotified', () => {
  test('persists current snapshots as new baseline', () => {
    const { mockSetProperty } = setupStore({
      lastNotifiedSnapshots: {},
      lastNotificationTime: 0,
    });

    const current: SnapshotMap = {
      'wapping::monday::2026-06-01': [slot({ time: '12 PM' })],
    };

    commitAsNotified(current, TODAY);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(saved.lastNotifiedSnapshots).toEqual(current);
    expect(saved.lastNotificationTime).toBeGreaterThan(0);
  });

  test('prunes snapshot entries whose date is in the past', () => {
    const { mockSetProperty } = setupStore({
      lastNotifiedSnapshots: {},
      lastNotificationTime: 0,
    });

    const current: SnapshotMap = {
      'wapping::monday::2025-01-01': [slot({ time: '12 PM' })],
      'wapping::monday::2026-06-01': [slot({ time: '1 PM' })],
    };

    commitAsNotified(current, TODAY);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(Object.keys(saved.lastNotifiedSnapshots)).toEqual([
      'wapping::monday::2026-06-01',
    ]);
  });

  test('preserves error queue and lastErrorSummaryTime', () => {
    const { mockSetProperty } = setupStore({
      lastNotifiedSnapshots: {},
      lastNotificationTime: 0,
      storedErrors: [
        {
          errorLabel: 'x',
          error: { type: 'fetch_error', message: 'm' },
          timestamp: 1,
        },
      ],
      lastErrorSummaryTime: 1234,
    });

    commitAsNotified({}, TODAY);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(saved.storedErrors).toHaveLength(1);
    expect(saved.lastErrorSummaryTime).toBe(1234);
  });

  test('preserves lastCheckedAt', () => {
    const { mockSetProperty } = setupStore({
      lastNotifiedSnapshots: {},
      lastNotificationTime: 0,
      lastCheckedAt: { 'wapping::monday': 9999 },
    });

    commitAsNotified({}, TODAY);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(saved.lastCheckedAt).toEqual({ 'wapping::monday': 9999 });
  });
});

describe('cadenceKey', () => {
  test('produces a deterministic key from location and day-of-week', () => {
    expect(cadenceKey('wapping', 'monday')).toBe('wapping::monday');
  });
});

describe('isDue', () => {
  test('returns true when no prior check recorded', () => {
    setupStore({ lastCheckedAt: {} });
    expect(isDue('wapping::monday', 1, Date.now())).toBe(true);
  });

  test('returns false when interval has not elapsed', () => {
    const lastCheck = 1_000_000;
    setupStore({ lastCheckedAt: { 'wapping::monday': lastCheck } });
    expect(isDue('wapping::monday', 3, lastCheck + HOUR_MS)).toBe(false);
  });

  test('returns true when interval has elapsed', () => {
    const lastCheck = 1_000_000;
    setupStore({ lastCheckedAt: { 'wapping::monday': lastCheck } });
    expect(isDue('wapping::monday', 3, lastCheck + 3 * HOUR_MS)).toBe(true);
  });

  test('treats checkEveryHours <= 0 as always due', () => {
    setupStore({ lastCheckedAt: { 'wapping::monday': Date.now() } });
    expect(isDue('wapping::monday', 0, Date.now())).toBe(true);
  });

  test('is due at exactly the interval boundary', () => {
    const lastCheck = 1_000_000;
    setupStore({ lastCheckedAt: { 'wapping::monday': lastCheck } });
    expect(isDue('wapping::monday', 3, lastCheck + 3 * HOUR_MS)).toBe(true);
    expect(isDue('wapping::monday', 3, lastCheck + 3 * HOUR_MS - 1)).toBe(
      false
    );
  });
});

describe('markChecked', () => {
  test('updates lastCheckedAt for all given keys', () => {
    const { mockSetProperty } = setupStore({ lastCheckedAt: {} });

    markChecked(['wapping::monday', 'ke::saturday'], 5000);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(saved.lastCheckedAt['wapping::monday']).toBe(5000);
    expect(saved.lastCheckedAt['ke::saturday']).toBe(5000);
  });

  test('preserves unrelated keys', () => {
    const { mockSetProperty } = setupStore({
      lastCheckedAt: { 'ke::sunday': 9999 },
    });

    markChecked(['wapping::monday'], 5000);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(saved.lastCheckedAt['ke::sunday']).toBe(9999);
    expect(saved.lastCheckedAt['wapping::monday']).toBe(5000);
  });

  test('no-ops when keys array is empty', () => {
    const { mockSetProperty } = setupStore({ lastCheckedAt: {} });

    markChecked([], 5000);

    expect(mockSetProperty).not.toHaveBeenCalled();
  });

  test('preserves lastNotifiedSnapshots and other state fields', () => {
    const { mockSetProperty } = setupStore({
      lastNotifiedSnapshots: {
        'wapping::monday::2026-06-01': [slot({ time: '12 PM' })],
      },
      lastNotificationTime: 7777,
      lastCheckedAt: {},
      storedErrors: [
        {
          errorLabel: 'x',
          error: { type: 'fetch_error', message: 'm' },
          timestamp: 1,
        },
      ],
      lastErrorSummaryTime: 4444,
    });

    markChecked(['wapping::monday'], 5000);

    const saved = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(saved.lastNotifiedSnapshots).toEqual({
      'wapping::monday::2026-06-01': [slot({ time: '12 PM' })],
    });
    expect(saved.lastNotificationTime).toBe(7777);
    expect(saved.storedErrors).toHaveLength(1);
    expect(saved.lastErrorSummaryTime).toBe(4444);
  });
});
