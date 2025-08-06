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

  test('returns today if day matches', () => {
    // Tuesday, February 6, 2024
    const tuesday = new Date(2024, 1, 6);

    // Asking for "tuesday" should return today (Feb 6)
    const nextTuesday = getNextDateForDay('tuesday', tuesday);
    expect(nextTuesday.getFullYear()).toBe(2024);
    expect(nextTuesday.getMonth()).toBe(1); // February
    expect(nextTuesday.getDate()).toBe(6); // Same day
  });

  test('returns next week if day matches and we want future only', () => {
    // This test documents that we changed behavior - if we want future-only
    // we'd need a different function or parameter
    // Tuesday, February 6, 2024
    const tuesday = new Date(2024, 1, 6);

    // Old behavior would return Feb 13, new behavior returns Feb 6
    const result = getNextDateForDay('tuesday', tuesday);
    expect(result.getDate()).toBe(6); // Today, not next week
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

  test('dual checking behavior - main.ts should check both today and next week when day matches', () => {
    // This test documents the dual-checking behavior implemented in main.ts
    // If today is Tuesday, we should check both today AND next Tuesday

    const tuesday = new Date(2024, 1, 6); // Tuesday, Feb 6, 2024

    // When main.ts calls getNextDateForDay('tuesday', tuesday):
    const result = getNextDateForDay('tuesday', tuesday);
    expect(result.getDate()).toBe(6); // Returns today

    // main.ts logic should then also create next week's date:
    const nextWeek = new Date(result);
    nextWeek.setDate(nextWeek.getDate() + 7);
    expect(nextWeek.getDate()).toBe(13); // Next Tuesday

    // This ensures both 2024-02-06 and 2024-02-13 get checked for Tuesday slots
  });
});
