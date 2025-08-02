import {
  generateResultsHash,
  hasResultsChanged,
  loadState,
} from '../src/store';
import { Day } from '../src/types';

// Mock GAS services
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

describe('generateResultsHash', () => {
  beforeEach(() => {
    // Mock MD5 computation to return consistent bytes
    (global.Utilities.computeDigest as jest.Mock).mockReturnValue([1, 2, 3, 4]);
  });

  test('returns "empty" for empty results', () => {
    const hash = generateResultsHash([]);
    expect(hash).toBe('empty');
  });

  test('generates consistent hash for same results', () => {
    const results = [mockDay];
    const hash1 = generateResultsHash(results);
    const hash2 = generateResultsHash(results);
    expect(hash1).toBe(hash2);
  });

  test('generates different hash for different results', () => {
    const results1 = [mockDay];
    const results2 = [{ ...mockDay, time: '1 PM' }];

    // Mock different MD5 outputs
    (global.Utilities.computeDigest as jest.Mock)
      .mockReturnValueOnce([1, 2, 3, 4])
      .mockReturnValueOnce([5, 6, 7, 8]);

    const hash1 = generateResultsHash(results1);
    const hash2 = generateResultsHash(results2);
    expect(hash1).not.toBe(hash2);
  });

  test('sorts results consistently', () => {
    const day1 = { ...mockDay, courtName: 'Court 1' };
    const day2 = { ...mockDay, courtName: 'Court 2' };

    const results1 = [day1, day2];
    const results2 = [day2, day1]; // Different order

    const hash1 = generateResultsHash(results1);
    const hash2 = generateResultsHash(results2);
    expect(hash1).toBe(hash2);
  });
});

describe('loadState', () => {
  let mockGetProperty: jest.Mock;

  beforeEach(() => {
    mockGetProperty = jest.fn();
    (global.PropertiesService.getScriptProperties as jest.Mock).mockReturnValue(
      {
        getProperty: mockGetProperty,
        setProperty: jest.fn(),
      }
    );
  });

  test('returns default state when no stored state exists', () => {
    mockGetProperty.mockReturnValue(null);

    const state = loadState();
    expect(state).toEqual({
      lastResultsHash: '',
      lastNotificationTime: 0,
    });
  });

  test('parses and returns stored state', () => {
    const storedState = {
      lastResultsHash: 'abc123',
      lastNotificationTime: 1234567890,
    };
    mockGetProperty.mockReturnValue(JSON.stringify(storedState));

    const state = loadState();
    expect(state).toEqual(storedState);
  });

  test('returns default state when stored data is invalid JSON', () => {
    mockGetProperty.mockReturnValue('invalid json');

    const state = loadState();
    expect(state).toEqual({
      lastResultsHash: '',
      lastNotificationTime: 0,
    });
  });
});

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
      lastResultsHash: '01020304', // Matches mocked MD5 output
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
});
