import { normalizeTime, getNextDateForDay, buildBookingUrl } from '../src/court-service';
import { CourtLocation } from '../src/types';

describe('normalizeTime', () => {
  test('converts uppercase to lowercase', () => {
    expect(normalizeTime('12 PM')).toBe('12pm');
    expect(normalizeTime('1 AM')).toBe('1am');
  });

  test('removes whitespace', () => {
    expect(normalizeTime(' 1pm ')).toBe('1pm');
    expect(normalizeTime('12 pm')).toBe('12pm');
    expect(normalizeTime('  2  pm  ')).toBe('2pm');
  });

  test('handles mixed case and spacing', () => {
    expect(normalizeTime(' 3 PM ')).toBe('3pm');
    expect(normalizeTime('11 Am')).toBe('11am');
  });
});

describe('getNextDateForDay', () => {
  test('returns next occurrence of specified day', () => {
    // Tuesday, February 6, 2024
    const tuesday = new Date(2024, 1, 6);
    
    // Next Wednesday should be Feb 7, 2024
    const nextWednesday = getNextDateForDay('wednesday', tuesday);
    expect(nextWednesday.getFullYear()).toBe(2024);
    expect(nextWednesday.getMonth()).toBe(1); // February (0-indexed)
    expect(nextWednesday.getDate()).toBe(7);
  });

  test('never returns today, even if day matches', () => {
    // Tuesday, February 6, 2024
    const tuesday = new Date(2024, 1, 6);
    
    // Asking for "tuesday" should return next Tuesday (Feb 13), not today
    const nextTuesday = getNextDateForDay('tuesday', tuesday);
    expect(nextTuesday.getFullYear()).toBe(2024);
    expect(nextTuesday.getMonth()).toBe(1); // February
    expect(nextTuesday.getDate()).toBe(13); // 7 days later
  });

  test('handles weekend correctly', () => {
    // Saturday, February 10, 2024
    const saturday = new Date(2024, 1, 10);
    
    // Next Sunday should be Feb 11, 2024
    const nextSunday = getNextDateForDay('sunday', saturday);
    expect(nextSunday.getDate()).toBe(11);
    
    // Next Monday should be Feb 12, 2024
    const nextMonday = getNextDateForDay('monday', saturday);
    expect(nextMonday.getDate()).toBe(12);
  });

  test('handles week wraparound', () => {
    // Sunday, February 11, 2024
    const sunday = new Date(2024, 1, 11);
    
    // Next Monday should be Feb 12, 2024
    const nextMonday = getNextDateForDay('monday', sunday);
    expect(nextMonday.getDate()).toBe(12);
    
    // Next Saturday should be Feb 17, 2024
    const nextSaturday = getNextDateForDay('saturday', sunday);
    expect(nextSaturday.getDate()).toBe(17);
  });
});

describe('buildBookingUrl', () => {
  const mockLocation: CourtLocation = {
    id: 'test-location',
    name: 'Test Location',
    baseUrl: 'https://example.com',
    path: 'test-courts',
    courts: [],
    htmlSelectors: {
      timeRowRegex: '',
      availableButtonSelector: '',
      courtNameSelector: ''
    }
  };

  test('builds correct URL format', () => {
    const url = buildBookingUrl(mockLocation, '2024-02-06');
    expect(url).toBe('https://example.com/book/courts/test-courts/2024-02-06');
  });

  test('handles different base URLs', () => {
    const location = { ...mockLocation, baseUrl: 'https://tennis.booking.com' };
    const url = buildBookingUrl(location, '2024-12-25');
    expect(url).toBe('https://tennis.booking.com/book/courts/test-courts/2024-12-25');
  });

  test('handles different paths', () => {
    const location = { ...mockLocation, path: 'wimbledon-courts' };
    const url = buildBookingUrl(location, '2024-07-01');
    expect(url).toBe('https://example.com/book/courts/wimbledon-courts/2024-07-01');
  });
});