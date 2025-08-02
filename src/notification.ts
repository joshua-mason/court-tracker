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

export function sendErrorSummaryNotification(
  errors: Array<{ errorLabel: string; error: CourtCheckError }>,
  now: Date,
  tz: string
): void {
  const nowStr = Utilities.formatDate(now, tz, 'EEE dd MMM yyyy HH:mm');
  const subject = `❌ Court-watch: ${errors.length} Error${errors.length > 1 ? 's' : ''} – ${nowStr}`;

  let body = `Failed to check availability for ${errors.length} day${errors.length > 1 ? 's' : ''}:\n\n`;

  errors.forEach(({ errorLabel, error }) => {
    body += `📅 ${errorLabel}\n`;
    body += `   Error: ${error.type}\n`;
    body += `   Message: ${error.message}\n`;
    if (error.url) body += `   URL: ${error.url}\n`;
    if (error.statusCode) body += `   Status: ${error.statusCode}\n`;
    body += '\n';
  });

  body += 'The system will retry on the next scheduled run.';

  MailApp.sendEmail({
    to: CONFIG.notificationEmail,
    subject,
    body,
  });

  Logger.log(`Sent error summary for ${errors.length} failed checks`);
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
