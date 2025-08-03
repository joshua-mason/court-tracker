import { CONFIG } from './config';
import { Day, CourtCheckError } from './types';
import { generateHtmlEmail } from './html-renderer';

export function sendNotificationEmail(allMatches: Day[]): void {
  const dateRange = getDateRange(allMatches);
  const subject = `🎾 Tennis slots available • ${dateRange} • ${allMatches.length} courts found`;

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

function getDateRange(matches: Day[]): string {
  if (matches.length === 0) return '';

  const dates = matches.map((m) => {
    const match = m.dateLabel.match(/\((\d{4})-(\d{2})-(\d{2})\)/);
    return match
      ? new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
      : new Date();
  });

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const formatDate = (date: Date) => {
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${month} ${date.getDate()}`;
  };

  if (minDate.getTime() === maxDate.getTime()) {
    return formatDate(minDate);
  } else {
    return `${formatDate(minDate)}-${formatDate(maxDate)}`;
  }
}
