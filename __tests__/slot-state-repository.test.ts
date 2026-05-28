import { hasResultsChanged, updateState } from '../src/slot-state-repository';
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

global.Utilities = {
  computeDigest: jest.fn(),
  DigestAlgorithm: {
    MD5: 1 as any,
  },
} as any;

global.Logger = {
  log: jest.fn(),
  clear: jest.fn(),
  getLog: jest.fn(),
};

const mockDay: Day = {
  dateLabel: 'monday (2024-02-06)',
  time: '12 PM',
  url: 'https://example.com/book/courts/test-courts/2024-02-06',
  locationName: 'Test Tennis Courts',
  courtName: 'Court 1',
};

describe('hasResultsChanged', () => {
  let mockGetProperty: jest.Mock;

  beforeEach(() => {
    mockGetProperty = jest.fn();
    (global.PropertiesService.getScriptProperties as jest.Mock).mockReturnValue(
      {
        getProperty: mockGetProperty,
        setProperty: jest.fn(),
      }
    );
    (global.Utilities.computeDigest as jest.Mock).mockReturnValue([1, 2, 3, 4]);
  });

  test('returns true when no previous state exists', () => {
    mockGetProperty.mockReturnValue(null);

    const changed = hasResultsChanged([mockDay]);
    expect(changed).toBe(true);
  });

  test('returns false when results are identical', () => {
    const storedState = {
      lastResultsHash: '01020304',
      lastNotificationTime: 123456,
    };
    mockGetProperty.mockReturnValue(JSON.stringify(storedState));

    const changed = hasResultsChanged([mockDay]);
    expect(changed).toBe(false);
  });

  test('returns true when results have changed', () => {
    const storedState = {
      lastResultsHash: 'different-hash',
      lastNotificationTime: 123456,
    };
    mockGetProperty.mockReturnValue(JSON.stringify(storedState));

    const changed = hasResultsChanged([mockDay]);
    expect(changed).toBe(true);
  });

  test('hashes consistently regardless of slot ordering', () => {
    const day1 = { ...mockDay, courtName: 'Court 1' };
    const day2 = { ...mockDay, courtName: 'Court 2' };

    mockGetProperty.mockReturnValue(
      JSON.stringify({ lastResultsHash: '01020304' })
    );

    expect(hasResultsChanged([day1, day2])).toBe(false);
    expect(hasResultsChanged([day2, day1])).toBe(false);
  });

  test('treats empty results as distinct from any non-empty hash', () => {
    mockGetProperty.mockReturnValue(
      JSON.stringify({ lastResultsHash: '01020304' })
    );

    expect(hasResultsChanged([])).toBe(true);
  });
});

describe('updateState', () => {
  let mockGetProperty: jest.Mock;
  let mockSetProperty: jest.Mock;

  beforeEach(() => {
    mockGetProperty = jest.fn().mockReturnValue(null);
    mockSetProperty = jest.fn();
    (global.PropertiesService.getScriptProperties as jest.Mock).mockReturnValue(
      {
        getProperty: mockGetProperty,
        setProperty: mockSetProperty,
      }
    );
    (global.Utilities.computeDigest as jest.Mock).mockReturnValue([1, 2, 3, 4]);
  });

  test('persists the current hash', () => {
    updateState([mockDay], false);

    expect(mockSetProperty).toHaveBeenCalled();
    const [, payload] = mockSetProperty.mock.calls[0];
    const saved = JSON.parse(payload);
    expect(saved.lastResultsHash).toBe('01020304');
  });

  test('updates lastNotificationTime only when notificationSent is true', () => {
    mockGetProperty.mockReturnValue(
      JSON.stringify({
        lastResultsHash: 'old',
        lastNotificationTime: 5000,
        storedErrors: [],
        lastErrorSummaryTime: 0,
      })
    );

    updateState([mockDay], false);
    const savedWithoutNotify = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(savedWithoutNotify.lastNotificationTime).toBe(5000);

    mockSetProperty.mockClear();
    updateState([mockDay], true);
    const savedWithNotify = JSON.parse(mockSetProperty.mock.calls[0][1]);
    expect(savedWithNotify.lastNotificationTime).toBeGreaterThan(5000);
  });
});
