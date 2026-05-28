import { loadState } from '../src/state-store';

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
      storedErrors: [],
      lastErrorSummaryTime: 0,
    });
  });

  test('parses and returns stored state, filling missing fields with defaults', () => {
    const storedState = {
      lastResultsHash: 'abc123',
      lastNotificationTime: 1234567890,
    };
    mockGetProperty.mockReturnValue(JSON.stringify(storedState));

    const state = loadState();
    expect(state).toEqual({
      lastResultsHash: 'abc123',
      lastNotificationTime: 1234567890,
      storedErrors: [],
      lastErrorSummaryTime: 0,
    });
  });

  test('returns default state when stored data is invalid JSON', () => {
    mockGetProperty.mockReturnValue('invalid json');

    const state = loadState();
    expect(state).toEqual({
      lastResultsHash: '',
      lastNotificationTime: 0,
      storedErrors: [],
      lastErrorSummaryTime: 0,
    });
  });
});
