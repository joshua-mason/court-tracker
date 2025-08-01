import { CONFIG } from "./config";
import { Day, CourtCheckError } from "./types";

export function sendNotificationEmail(allMatches: Day[], now: Date, tz: string): void {
  const nowStr = Utilities.formatDate(now, tz, "EEE dd MMM yyyy HH:mm");
  const subject = `🎾 ${allMatches.length} free court slot${allMatches.length > 1 ? "s" : ""} found – ${nowStr}`;
  let body = `The following slots are available:\n\n`;

  const grouped = groupMatchesByDay(allMatches);

  for (const [dateLabel, slots] of Object.entries(grouped)) {
    body += `📅 ${dateLabel}\n`;
    slots.forEach((s: Day) => {
      body += `• ${s.time}\n`;
    });
    body += `→ Book: ${slots[0].url}\n\n`;
  }

  MailApp.sendEmail({
    to: CONFIG.notificationEmail,
    subject,
    body,
  });

  Logger.log(`Sent 1 email with ${allMatches.length} slot(s)`);
}

export function sendErrorSummaryNotification(errors: Array<{ errorLabel: string; error: CourtCheckError }>, now: Date, tz: string): void {
  const nowStr = Utilities.formatDate(now, tz, "EEE dd MMM yyyy HH:mm");
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


function groupMatchesByDay(matches: Day[]): Record<string, Day[]> {
  const grouped: Record<string, Day[]> = {};
  matches.forEach((m: Day) => {
    if (!grouped[m.dateLabel]) grouped[m.dateLabel] = [];
    grouped[m.dateLabel].push(m);
  });
  return grouped;
}