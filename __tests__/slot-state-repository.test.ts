import {
  makeKey,
  diff,
  commitAsNotified,
  getLastNotifiedSnapshots,
  SnapshotMap,
} from '../src/slot-state-repository';
import { Day } from '../src/types';

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
});
