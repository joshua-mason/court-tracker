import { CONFIG } from './config';
import { Day, CourtCheckError } from './types';
import { generateHtmlEmail } from './html-renderer';

export function sendNotificationEmail(allMatches: Day[]): void {
  const subject = `🎾 ${getCompactTimesSummary(allMatches)}`;

  const htmlBody = generateHtmlEmail(allMatches);

  MailApp.sendEmail({
    to: CONFIG.notificationEmail,
    subject,
    htmlBody,
  });

  Logger.log(`Sent 1 email with ${allMatches.length} slot(s)`);
}

export function sendWeeklyErrorSummaryNotification(
  errors: Array<{
    errorLabel: string;
    error: CourtCheckError;
    timestamp: number;
  }>,
  now: Date,
  tz: string
): void {
  const nowStr = Utilities.formatDate(now, tz, 'EEE dd MMM yyyy HH:mm');
  const subject = `📅 Weekly Court-watch Error Summary: ${errors.length} Error${errors.length > 1 ? 's' : ''} – ${nowStr}`;

  const groupedByDate = new Map<
    string,
    Array<{ errorLabel: string; error: CourtCheckError }>
  >();

  // Group errors by date
  errors.forEach(({ errorLabel, error, timestamp }) => {
    const date = Utilities.formatDate(
      new Date(timestamp),
      tz,
      'EEE dd MMM yyyy'
    );
    if (!groupedByDate.has(date)) {
      groupedByDate.set(date, []);
    }
    groupedByDate.get(date)!.push({ errorLabel, error });
  });

  let body = `Weekly error summary covering ${errors.length} failed check${errors.length > 1 ? 's' : ''} across ${groupedByDate.size} day${groupedByDate.size > 1 ? 's' : ''}:\n\n`;

  for (const [date, dayErrors] of groupedByDate.entries()) {
    body += `📅 ${date} (${dayErrors.length} error${dayErrors.length > 1 ? 's' : ''})\n`;
    dayErrors.forEach(({ errorLabel, error }) => {
      body += `   • ${errorLabel}: ${error.type}\n`;
      if (error.message !== error.type) {
        body += `     ${error.message}\n`;
      }
    });
    body += '\n';
  }

  body +=
    'These errors have been cleared from the system. Monitoring continues normally.';

  MailApp.sendEmail({
    to: CONFIG.notificationEmail,
    subject,
    body,
  });

  Logger.log(
    `Sent weekly error summary for ${errors.length} failed checks across ${groupedByDate.size} days`
  );
}

function getCompactTimesSummary(matches: Day[]): string {
  if (matches.length === 0) return 'No slots available';

  // Group by date
  const slotsByDate = new Map<string, Day[]>();
  matches.forEach((match) => {
    const dateMatch = match.dateLabel.match(/\((\d{4})-(\d{2})-(\d{2})\)/);
    if (dateMatch) {
      const dateKey = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      if (!slotsByDate.has(dateKey)) {
        slotsByDate.set(dateKey, []);
      }
      slotsByDate.get(dateKey)!.push(match);
    }
  });

  // Sort dates chronologically
  const sortedDates = Array.from(slotsByDate.keys()).sort();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  let summary = '';
  let totalChars = 0;
  let processedSlots = 0;
  const maxChars = 45; // Leave room for emoji and potential "+ X more"

  for (const dateKey of sortedDates) {
    const dateSlots = slotsByDate.get(dateKey)!;
    const [year, month, day] = dateKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    // Determine day label
    let dayLabel: string;
    if (dateKey === todayStr) {
      dayLabel = 'Today';
    } else {
      const dayNames = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
      dayLabel = dayNames[date.getDay()];
    }

    // Get times for this date, remove duplicates and sort
    const times = [
      ...new Set(
        dateSlots.map((slot) => {
          return slot.time
            .replace(' PM', 'p')
            .replace(' AM', 'a')
            .toLowerCase();
        })
      ),
    ].sort();

    const dayPart = `${dayLabel} ${times.join(', ')}`;
    const withSeparator = summary ? `; ${dayPart}` : dayPart;

    // Check if adding this would exceed our limit
    if (totalChars + withSeparator.length > maxChars) {
      const remaining = matches.length - processedSlots;
      if (remaining > 0) {
        summary += ` + ${remaining} more`;
      }
      break;
    }

    summary += withSeparator;
    totalChars += withSeparator.length;
    processedSlots += dateSlots.length;
  }

  return summary;
}
