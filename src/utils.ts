/**
 * Gets the next occurrence of a specific day of the week
 * Includes today if it matches the target day
 *
 * Examples:
 * - If today is Tuesday and you ask for "wednesday", returns tomorrow
 * - If today is Tuesday and you ask for "tuesday", returns today
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
  // Include today if it matches
  if (delta === 0) delta = 0;

  date.setDate(date.getDate() + delta);
  return date;
}
