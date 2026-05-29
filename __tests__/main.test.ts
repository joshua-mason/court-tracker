import { checkCourtAvailability } from '../src/main';

// Mock all dependencies
jest.mock('../src/config', () => ({
  COURT_LOCATIONS: [
    {
      id: 'test-location',
      name: 'Test Location',
      baseUrl: 'https://example.com',
      path: 'test-path',
      courts: [{ name: 'Court 1', displayName: 'Court 1' }],
      htmlSelectors: {
        timeRowRegex:
          '<tr>\\s*<th class="time">(.+?)</th>\\s*<td class="courts">([\\s\\S]*?)</td>\\s*</tr>',
        availableButtonSelector: 'button available',
        courtNameSelector: 'Court 1',
      },
    },
  ],
  LOCATION_SCHEDULES: [
    {
      locationId: 'test-location',
      watchDays: [
        {
          day: 'tuesday',
          hours: ['12pm', '1pm'],
        },
      ],
    },
  ],
  CONFIG: { notificationEmail: 'test@example.com' },
}));

jest.mock('../src/http-client');
jest.mock('../src/html-parser');
jest.mock('../src/slot-state-repository');
jest.mock('../src/error-queue-repository');
jest.mock('../src/notification');

import { fetchHtml } from '../src/http-client';
import { extractAvailableSlots, buildBookingUrl } from '../src/html-parser';
import {
  diff,
  getLastNotifiedSnapshots,
  isDue,
} from '../src/slot-state-repository';
import { shouldSendErrorSummary } from '../src/error-queue-repository';

// Mock GAS global objects
global.Session = {
  getScriptTimeZone: jest.fn(() => 'UTC'),
} as any;

global.Utilities = {
  formatDate: jest.fn((date: Date, _tz: string, _format: string) => {
    // Mock formatting to return predictable date strings
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
} as any;

global.Logger = {
  log: jest.fn(),
} as any;

describe('checkCourtAvailability - Dual Checking Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks with default success responses
    (fetchHtml as jest.Mock).mockReturnValue({
      success: true,
      data: '<html>mock</html>',
    });

    (buildBookingUrl as jest.Mock).mockImplementation(
      (location, dateStr) =>
        `${location.baseUrl}/book/courts/${location.path}/${dateStr}`
    );

    (extractAvailableSlots as jest.Mock).mockReturnValue([]);
    (getLastNotifiedSnapshots as jest.Mock).mockReturnValue({});
    (isDue as jest.Mock).mockReturnValue(true);
    (diff as jest.Mock).mockReturnValue({
      added: [],
      removed: [],
      allCurrent: [],
    });
    (shouldSendErrorSummary as jest.Mock).mockReturnValue(false);
  });

  test('checks both today and next week when today matches configured day', () => {
    // Mock system time to Tuesday, March 5, 2024
    const mockTuesday = new Date(2024, 2, 5); // Month is 0-indexed, so 2 = March
    jest.useFakeTimers();
    jest.setSystemTime(mockTuesday);

    checkCourtAvailability();

    // Verify fetchHtml was called twice for the Tuesday configuration
    expect(fetchHtml).toHaveBeenCalledTimes(2);

    // Check that it called with today's date (2024-03-05)
    expect(fetchHtml).toHaveBeenCalledWith(
      'https://example.com/book/courts/test-path/2024-03-05',
      'Test Location'
    );

    // Check that it called with next week's date (2024-03-12)
    expect(fetchHtml).toHaveBeenCalledWith(
      'https://example.com/book/courts/test-path/2024-03-12',
      'Test Location'
    );

    // Verify extractAvailableSlots was called for both dates
    expect(extractAvailableSlots).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });

  test('checks only next occurrence when today does not match configured day', () => {
    // Mock system time to Monday, March 4, 2024 (but config is for Tuesday)
    const mockMonday = new Date(2024, 2, 4);
    jest.useFakeTimers();
    jest.setSystemTime(mockMonday);

    checkCourtAvailability();

    // Verify fetchHtml was called only once
    expect(fetchHtml).toHaveBeenCalledTimes(1);

    // Check that it called with tomorrow's date (2024-03-05) only
    expect(fetchHtml).toHaveBeenCalledWith(
      'https://example.com/book/courts/test-path/2024-03-05',
      'Test Location'
    );

    expect(extractAvailableSlots).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });
});

describe('checkCourtAvailability - Cadence + Refresh-on-change', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (fetchHtml as jest.Mock).mockReturnValue({
      success: true,
      data: '<html>mock</html>',
    });
    (buildBookingUrl as jest.Mock).mockImplementation(
      (location, dateStr) =>
        `${location.baseUrl}/book/courts/${location.path}/${dateStr}`
    );
    (extractAvailableSlots as jest.Mock).mockReturnValue([]);
    (getLastNotifiedSnapshots as jest.Mock).mockReturnValue({});
    (shouldSendErrorSummary as jest.Mock).mockReturnValue(false);
    (diff as jest.Mock).mockReturnValue({
      added: [],
      removed: [],
      allCurrent: [],
    });

    // Pin date to Monday so the tuesday config triggers a single fetch.
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 2, 4));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('skips fetching when the schedule is not due', () => {
    (isDue as jest.Mock).mockReturnValue(false);

    checkCourtAvailability();

    expect(fetchHtml).not.toHaveBeenCalled();
  });

  test('fetches when the schedule is due', () => {
    (isDue as jest.Mock).mockReturnValue(true);

    checkCourtAvailability();

    expect(fetchHtml).toHaveBeenCalledTimes(1);
  });

  test('does not refresh-all when no change is detected', () => {
    // Only one schedule in this config, so "refresh-all" path isn't directly
    // observable here. But we can assert that the diff doesn't trigger an
    // extra fetch when it reports no changes.
    (isDue as jest.Mock).mockReturnValue(true);
    (diff as jest.Mock).mockReturnValue({
      added: [],
      removed: [],
      allCurrent: [],
    });

    checkCourtAvailability();

    expect(fetchHtml).toHaveBeenCalledTimes(1);
  });
});
