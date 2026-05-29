import { checkCourtAvailability } from '../src/main';

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
  // Two schedules so the refresh-all path is actually observable:
  // one due (tuesday), one not-due (wednesday with 3h cadence).
  LOCATION_SCHEDULES: [
    {
      locationId: 'test-location',
      watchDays: [
        { day: 'tuesday', hours: ['12pm'] },
        { day: 'wednesday', hours: ['12pm'], checkEveryHours: 3 },
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
  markChecked,
  cadenceKey,
} from '../src/slot-state-repository';
import { shouldSendErrorSummary } from '../src/error-queue-repository';
import { sendNotificationEmail } from '../src/notification';

global.Session = {
  getScriptTimeZone: jest.fn(() => 'UTC'),
} as any;

global.Utilities = {
  formatDate: jest.fn((date: Date, _tz: string, _format: string) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
} as any;

global.Logger = { log: jest.fn() } as any;

describe('checkCourtAvailability — refresh-all-on-change', () => {
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
    (cadenceKey as jest.Mock).mockImplementation(
      (loc, day) => `${loc}::${day}`
    );

    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 2, 4)); // Monday
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('refreshes not-due schedules when a due schedule reveals a change', () => {
    // tuesday is due, wednesday is not.
    (isDue as jest.Mock).mockImplementation(
      (key: string) => key === 'test-location::tuesday'
    );

    // First diff (after due-pass only) reports a change. Second diff (after
    // refresh-all) also reports a change so the email path triggers.
    const fakeSlot = {
      dateLabel: 'tuesday (2024-03-05)',
      time: '12 PM',
      url: 'x',
      locationName: 'Test',
      courtName: 'Court 1',
    };
    (diff as jest.Mock).mockReturnValue({
      added: [fakeSlot],
      removed: [],
      allCurrent: [fakeSlot],
    });

    checkCourtAvailability();

    // Both schedules' fetch URLs got called: tuesday on the due-pass,
    // wednesday on the refresh-all pass.
    expect(fetchHtml).toHaveBeenCalledTimes(2);
    expect(fetchHtml).toHaveBeenCalledWith(
      'https://example.com/book/courts/test-path/2024-03-05',
      'Test Location'
    );
    expect(fetchHtml).toHaveBeenCalledWith(
      'https://example.com/book/courts/test-path/2024-03-06',
      'Test Location'
    );

    // markChecked received both cadenceKeys (refresh-all resets cadence
    // for every schedule we fetched, including wednesday).
    expect(markChecked).toHaveBeenCalledTimes(1);
    const calledKeys = (markChecked as jest.Mock).mock.calls[0][0] as string[];
    expect(calledKeys.sort()).toEqual([
      'test-location::tuesday',
      'test-location::wednesday',
    ]);

    expect(sendNotificationEmail).toHaveBeenCalledTimes(1);
  });

  test('does not refresh not-due schedules when no change is detected', () => {
    (isDue as jest.Mock).mockImplementation(
      (key: string) => key === 'test-location::tuesday'
    );
    (diff as jest.Mock).mockReturnValue({
      added: [],
      removed: [],
      allCurrent: [],
    });

    checkCourtAvailability();

    // Only tuesday gets fetched; wednesday stays skipped.
    expect(fetchHtml).toHaveBeenCalledTimes(1);
    expect(fetchHtml).toHaveBeenCalledWith(
      'https://example.com/book/courts/test-path/2024-03-05',
      'Test Location'
    );

    // markChecked only records the due schedule.
    expect(markChecked).toHaveBeenCalledTimes(1);
    const calledKeys = (markChecked as jest.Mock).mock.calls[0][0] as string[];
    expect(calledKeys).toEqual(['test-location::tuesday']);

    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });
});
