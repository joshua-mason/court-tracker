import { getNextDateForDay } from '../src/utils';

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