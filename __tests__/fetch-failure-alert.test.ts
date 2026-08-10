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
  LOCATION_SCHEDULES: [
    {
      locationId: 'test-location',
      watchDays: [{ day: 'tuesday', hours: ['12pm'] }],
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
import {
  shouldSendErrorSummary,
  shouldSendFailureAlert,
  markFailureAlertSent,
} from '../src/error-queue-repository';
import { sendFetchFailureAlert } from '../src/notification';

global.Session = { getScriptTimeZone: jest.fn(() => 'UTC') } as any;

global.Utilities = {
  formatDate: jest.fn((date: Date, _tz: string, _format: string) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
} as any;

global.Logger = { log: jest.fn() } as any;

const CHALLENGE_ERROR = {
  success: false,
  error: {
    type: 'bot_challenge',
    message:
      'Blocked by human-verification interstitial (Cloudflare Turnstile)',
    url: 'https://example.com/book/courts/test-path/2026-06-02',
    locationName: 'Test Location',
  },
};

describe('checkCourtAvailability — non-silent fetch failure', () => {
  beforeEach(() => {
    jest.clearAllMocks();

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
    (shouldSendFailureAlert as jest.Mock).mockReturnValue(true);
  });

  test('alerts when every fetch is blocked by the human-verification page', () => {
    (fetchHtml as jest.Mock).mockReturnValue(CHALLENGE_ERROR);

    checkCourtAvailability();

    expect(sendFetchFailureAlert).toHaveBeenCalledTimes(1);
    const [errors] = (sendFetchFailureAlert as jest.Mock).mock.calls[0];
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].error.type).toBe('bot_challenge');
    expect(markFailureAlertSent).toHaveBeenCalledTimes(1);
  });

  test('suppresses the alert when one was already sent within 24h', () => {
    (fetchHtml as jest.Mock).mockReturnValue(CHALLENGE_ERROR);
    (shouldSendFailureAlert as jest.Mock).mockReturnValue(false);

    checkCourtAvailability();

    expect(sendFetchFailureAlert).not.toHaveBeenCalled();
    expect(markFailureAlertSent).not.toHaveBeenCalled();
  });

  test('does not alert when at least one fetch succeeds', () => {
    (fetchHtml as jest.Mock).mockReturnValue({
      success: true,
      data: '<html>mock</html>',
    });

    checkCourtAvailability();

    expect(sendFetchFailureAlert).not.toHaveBeenCalled();
  });

  test('does not alert when nothing was due to fetch', () => {
    (isDue as jest.Mock).mockReturnValue(false);
    (fetchHtml as jest.Mock).mockReturnValue(CHALLENGE_ERROR);

    checkCourtAvailability();

    expect(fetchHtml).not.toHaveBeenCalled();
    expect(sendFetchFailureAlert).not.toHaveBeenCalled();
  });
});
