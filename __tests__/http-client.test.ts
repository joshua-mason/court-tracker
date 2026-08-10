import { fetchHtml } from '../src/http-client';

global.Logger = { log: jest.fn() } as any;
global.Utilities = { sleep: jest.fn() } as any;

const mockFetch = jest.fn();
global.UrlFetchApp = { fetch: mockFetch } as any;

const respond = (statusCode: number, body: string) => ({
  getResponseCode: () => statusCode,
  getContentText: () => body,
});

// Trimmed from the real interstitial tennistowerhamlets.com now serves.
const CHALLENGE_PAGE = `<!doctype html><html><head><title>Book courts and pitches in Tower Hamlets with Courtside</title></head>
<body><h1>Just checking&hellip;</h1>
<p>Before you can continue we need to verify that you're actually a person.</p>
<div class="cf-turnstile" data-sitekey="0x4AAA"></div>
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script>
</body></html>`;

const BOOKING_PAGE = `<html><body><table>
<tr><th class="time">12 PM</th><td class="courts"><button class="button available">Court 1</button></td></tr>
</table></body></html>`;

describe('fetchHtml — failure visibility', () => {
  beforeEach(() => jest.clearAllMocks());

  test('reports bot_challenge when a 200 response is the verification page', () => {
    mockFetch.mockReturnValue(respond(200, CHALLENGE_PAGE));

    const result = fetchHtml(
      'https://tennistowerhamlets.com/x',
      'Test Location'
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('bot_challenge');
    expect(result.error.message).toContain('human-verification');
  });

  test('logs the response body when blocked, so the cause is visible in the log', () => {
    mockFetch.mockReturnValue(respond(200, CHALLENGE_PAGE));

    fetchHtml('https://tennistowerhamlets.com/x', 'Test Location');

    const logged = (global.Logger.log as jest.Mock).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(logged).toContain('Bot challenge served for Test Location');
    expect(logged).toContain('actually a person');
  });

  test('logs the body for a generic missing-table response too', () => {
    mockFetch.mockReturnValue(
      respond(200, '<html><body>nothing here</body></html>')
    );

    const result = fetchHtml(
      'https://tennistowerhamlets.com/x',
      'Test Location'
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe('html_parse_error');

    const logged = (global.Logger.log as jest.Mock).mock.calls
      .map((c) => String(c[0]))
      .join('\n');
    expect(logged).toContain('No <tr> in response');
    expect(logged).toContain('nothing here');
  });

  test('still succeeds on a normal booking page', () => {
    mockFetch.mockReturnValue(respond(200, BOOKING_PAGE));

    const result = fetchHtml(
      'https://tennistowerhamlets.com/x',
      'Test Location'
    );

    expect(result.success).toBe(true);
  });
});
