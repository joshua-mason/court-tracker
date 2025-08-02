import { sendNotificationEmail } from '../src/notification';
import { Day } from '../src/types';

// Mock GAS services
global.MailApp = {
  sendEmail: jest.fn(),
} as any;

global.Logger = {
  log: jest.fn(),
  clear: jest.fn(),
  getLog: jest.fn(),
};

global.Utilities = {
  formatDate: jest.fn(() => 'Thu 06 Feb 2024 14:30'),
} as any;

// Mock the config import
jest.mock('../src/config', () => ({
  CONFIG: {
    notificationEmail: 'test@example.com',
  },
}));

const createMockDay = (overrides: Partial<Day> = {}): Day => ({
  dateLabel: 'monday (2024-02-06)',
  time: '12 PM',
  url: 'https://tennistowerhamlets.com/book/courts/wapping-gardens/2024-02-06',
  locationName: 'Wapping Gardens Tennis Courts',
  courtName: 'Court 1',
  ...overrides,
});

describe('sendNotificationEmail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends email with HTML format for single court', () => {
    const matches = [createMockDay()];

    sendNotificationEmail(matches);

    expect(global.MailApp.sendEmail).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: '🎾 Tennis slots available • Feb 6 • 1 courts found',
      htmlBody: expect.stringContaining('<table'),
    });

    const emailCall = (global.MailApp.sendEmail as jest.Mock).mock.calls[0][0];
    const htmlBody = emailCall.htmlBody;

    expect(htmlBody).toContain('🎾 Court Availability');
    expect(htmlBody).toContain('🏟️ Wapping Gardens');
    expect(htmlBody).toContain('Mon Feb 6');
    expect(htmlBody).toContain('12 pm');
    expect(htmlBody).toContain('Book Court →');
  });

  test('formats multiple courts at same location correctly', () => {
    const matches = [
      createMockDay({ time: '12 PM', courtName: 'Court 1' }),
      createMockDay({ time: '1 PM', courtName: 'Court 2' }),
    ];

    sendNotificationEmail(matches);

    const emailCall = (global.MailApp.sendEmail as jest.Mock).mock.calls[0][0];
    const htmlBody = emailCall.htmlBody;

    expect(htmlBody).toContain('12 pm');
    expect(htmlBody).toContain('1 pm');
    expect(htmlBody).toContain('Court 2');
  });

  test('handles multiple locations correctly', () => {
    const matches = [
      createMockDay({
        locationName: 'Wapping Gardens Tennis Courts',
        url: 'https://tennistowerhamlets.com/book/courts/wapping-gardens/2024-02-06',
      }),
      createMockDay({
        locationName: 'King Edward Memorial Park',
        url: 'https://tennistowerhamlets.com/book/courts/king-edward-memorial-park/2024-02-06',
      }),
    ];

    sendNotificationEmail(matches);

    const emailCall = (global.MailApp.sendEmail as jest.Mock).mock.calls[0][0];
    const htmlBody = emailCall.htmlBody;

    expect(htmlBody).toContain('🏟️ Wapping Gardens');
    expect(htmlBody).toContain('🏟️ King Edward Park');
    expect(htmlBody).toContain('wapping-gardens/2024-02-06');
    expect(htmlBody).toContain('king-edward-memorial-park/2024-02-06');
  });

  test('formats date range correctly in subject', () => {
    const matches = [
      createMockDay({ dateLabel: 'monday (2024-02-06)' }),
      createMockDay({ dateLabel: 'friday (2024-02-09)' }),
    ];

    sendNotificationEmail(matches);

    const emailCall = (global.MailApp.sendEmail as jest.Mock).mock.calls[0][0];
    expect(emailCall.subject).toBe(
      '🎾 Tennis slots available • Feb 6-Feb 9 • 2 courts found'
    );
  });

  test('logs successful email send', () => {
    const matches = [createMockDay()];

    sendNotificationEmail(matches);

    expect(global.Logger.log).toHaveBeenCalledWith(
      'Sent 1 email with 1 slot(s)'
    );
  });
});
