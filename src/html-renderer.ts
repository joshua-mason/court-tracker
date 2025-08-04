import { Day } from './types';

interface LocationTheme {
  primary: string;
  background: string;
  borderColor: string;
}

const THEMES: LocationTheme[] = [
  {
    primary: '#2E7D32',
    background: '#E8F5E8',
    borderColor: '#2E7D32',
  },
  {
    primary: '#D2691E',
    background: '#FDF2E9',
    borderColor: '#D2691E',
  },
];

export function generateHtmlEmail(allMatches: Day[]): string {
  const grouped = groupMatchesByLocation(allMatches);

  let html = `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tennis Court Availability</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f8f0;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f8f0;">
        <tr>
            <td align="center" style="padding:20px;">
                <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background-color:#f0f8f0;">
                    <tr>
                        <td style="text-align:center;padding-bottom:20px;">
                            <h2 style="margin:0;color:#2E7D32;font-size:18px;font-weight:normal;font-family:Arial,sans-serif;">
                                🎾 Court Availability
                            </h2>
                        </td>
                    </tr>`;

  let themeIndex = 0;
  for (const slots of Object.values(grouped)) {
    const firstSlot = slots[0];
    const shortLocationName = getShortLocationName(firstSlot.locationName);
    const theme = THEMES[themeIndex % THEMES.length];

    html += renderLocationCard(slots, shortLocationName, theme);
    themeIndex++;
  }

  html += `
                    <tr>
                        <td style="text-align:center;color:#777;font-size:13px;padding-top:20px;padding:16px;background-color:#ffffff;border-radius:8px;">
                            🎾 Available now • Tap to reserve your spot on the court
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;

  return html;
}

function renderLocationCard(
  slots: Day[],
  locationName: string,
  theme: LocationTheme
): string {
  const slotsByDate = groupSlotsByDate(slots);

  let card = `
                    <tr>
                        <td style="padding-bottom:20px;">
                            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:3px solid ${theme.borderColor};border-radius:12px;">
                                <tr>
                                    <td style="padding:20px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding-bottom:12px;">
                                                    <h3 style="margin:0;color:${theme.primary};font-size:17px;font-weight:normal;font-family:Arial,sans-serif;">
                                                        🏟️ ${locationName}
                                                    </h3>
                                                </td>
                                            </tr>`;

  for (const [dateLabel, dateSlots] of Object.entries(slotsByDate)) {
    const formattedDate = formatDateLabel(dateLabel);
    const timeSlots = renderTimeSlots(dateSlots, theme);

    card += `
                                            <tr>
                                                <td style="padding-bottom:12px;">
                                                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        <tr>
                                                            <td style="padding:6px 10px;background-color:#f5f5f5;border-radius:6px;font-size:14px;font-weight:600;color:#444;font-family:Arial,sans-serif;width:80px;">
                                                                ${formattedDate}
                                                            </td>
                                                            <td style="padding-left:10px;">
                                                                ${timeSlots}
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>`;
  }

  card += `
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>`;

  return card;
}

function renderTimeSlots(slots: Day[], theme: LocationTheme): string {
  const timeSlotElements = slots.map((slot) => {
    const time = slot.time.toLowerCase();
    const courtInfo =
      slots.length > 1 && slot.courtName !== 'Court 1'
        ? ` (${slot.courtName})`
        : '';

    return `
                                                                <td style="padding-right:6px;padding-bottom:4px;">
                                                                    <table cellpadding="0" cellspacing="0" border="0">
                                                                        <tr>
                                                                            <td style="background-color:${theme.background};color:${theme.primary};padding:6px 10px;border-radius:16px;font-size:13px;font-weight:500;border:1px solid ${theme.borderColor};font-family:Arial,sans-serif;">
                                                                                <a href="${slot.url}" style="color:${theme.primary};text-decoration:none;display:block;" target="_blank">
                                                                                    <strong>${time}</strong>${courtInfo} 🎾
                                                                                </a>
                                                                            </td>
                                                                        </tr>
                                                                    </table>
                                                                </td>`;
  });

  return `
                                                                <table cellpadding="0" cellspacing="0" border="0">
                                                                    <tr>
                                                                        ${timeSlotElements.join('')}
                                                                    </tr>
                                                                </table>`;
}

function getShortLocationName(locationName: string): string {
  if (locationName.toLowerCase().includes('wapping')) return 'Wapping Gardens';
  if (locationName.toLowerCase().includes('king edward'))
    return 'King Edward Park';
  return locationName;
}

function formatDateLabel(dateLabel: string): string {
  // Convert "monday (2024-02-06)" to "Mon Aug 6"
  const match = dateLabel.match(/(\w+)\s*\((\d{4})-(\d{2})-(\d{2})\)/);
  if (!match) return dateLabel;

  const [, dayName, year, month, day] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  const shortDay = dayName.charAt(0).toUpperCase() + dayName.slice(1, 3);
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = parseInt(day);

  return `${shortDay} ${monthName} ${dayNum}`;
}

function groupMatchesByLocation(matches: Day[]): Record<string, Day[]> {
  const grouped: Record<string, Day[]> = {};
  matches.forEach((m: Day) => {
    const key = m.locationName;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(m);
  });
  return grouped;
}

function groupSlotsByDate(slots: Day[]): Record<string, Day[]> {
  const grouped: Record<string, Day[]> = {};
  slots.forEach((slot: Day) => {
    if (!grouped[slot.dateLabel]) grouped[slot.dateLabel] = [];
    grouped[slot.dateLabel].push(slot);
  });
  return grouped;
}
