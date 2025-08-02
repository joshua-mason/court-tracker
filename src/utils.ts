/**
 * Gets the next occurrence of a specific day of the week
 * Always returns a future date (never today, even if it matches)
 *
 * Examples:
 * - If today is Tuesday and you ask for "wednesday", returns tomorrow
 * - If today is Tuesday and you ask for "tuesday", returns next Tuesday (in 7 days)
 */
export function getNextDateForDay(targetDay: string, fromDate: Date): Date {
  // JavaScript weekday indexes: Sunday=0, Monday=1, Tuesday=2, etc.
  const dayToIndex: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const date = new Date(fromDate);
  const currentDay = date.getDay();
  const targetWeekday = dayToIndex[targetDay];

  let delta = (targetWeekday - currentDay + 7) % 7;
  if (delta === 0) delta = 7; // Always move forward at least 1 week

  date.setDate(date.getDate() + delta);
  return date;
}
