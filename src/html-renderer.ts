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
  const grouped = groupMatchesByLocationAndDay(allMatches);

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tennis Court Availability</title>
</head>
<body>
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:linear-gradient(135deg, #f8fffe 0%, #f0f8f0 100%)">
        <div style="text-align:center;margin-bottom:16px">
            <h2 style="margin:0;color:#2E7D32;font-size:16px;font-weight:500">
                🎾 Court Availability
            </h2>
        </div>
  `;

  let themeIndex = 0;
  for (const slots of Object.values(grouped)) {
    const firstSlot = slots[0];
    const shortLocationName = getShortLocationName(firstSlot.locationName);
    const theme = THEMES[themeIndex % THEMES.length];

    html += renderLocationCard(slots, shortLocationName, theme);
    themeIndex++;
  }

  html += `
        <div style="text-align:center;color:#777;font-size:13px;margin-top:24px;padding:16px;background:rgba(255,255,255,0.7);border-radius:12px;backdrop-filter:blur(10px)">
            🎾 Available now • Tap to reserve your spot on the court
        </div>
    </div>
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
  const shadowColor =
    theme.primary === '#2E7D32'
      ? 'rgba(46,125,50,0.08)'
      : 'rgba(210,105,30,0.08)';

  let card = `
        <div style="margin-bottom:20px;padding:20px;background:white;border-radius:16px;box-shadow:0 3px 10px ${shadowColor};border-top:3px solid ${theme.borderColor}">
            <h3 style="margin:0 0 12px 0;color:${theme.primary};font-size:17px;font-weight:500;display:flex;align-items:center;gap:8px">
                🏟️ ${locationName}
            </h3>
  `;

  for (const [dateLabel, dateSlots] of Object.entries(slotsByDate)) {
    const formattedDate = formatDateLabel(dateLabel);
    const timeSlots = renderTimeSlots(dateSlots, theme);

    card += `
            <div style="margin-bottom:12px;display:flex;align-items:center;flex-wrap:wrap;gap:8px">
                <span style="font-weight:600;color:#444;background:#f5f5f5;padding:6px 10px;border-radius:8px;font-size:14px">
                    ${formattedDate}
                </span>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                    ${timeSlots}
                </div>
            </div>
    `;
  }

  const bookingUrl = `https://tennistowerhamlets.com/book/courts/${getShortUrl(slots[0].url)}`;
  card += `
            <div style="margin-top:16px">
                <a href="${bookingUrl}" style="color:${theme.primary};text-decoration:none;font-weight:500;background:${theme.background};padding:8px 16px;border-radius:20px;font-size:14px;display:inline-block;transition:all 0.2s" target="_blank">
                    Book Court →
                </a>
            </div>
        </div>
  `;

  return card;
}

function renderTimeSlots(slots: Day[], theme: LocationTheme): string {
  return slots
    .map((slot) => {
      const time = slot.time.toLowerCase();
      const courtInfo =
        slots.length > 1 && slot.courtName !== 'Court 1'
          ? ` (${slot.courtName})`
          : '';

      return `<span style="background:${theme.background};color:${theme.primary};padding:6px 10px;border-radius:20px;font-size:13px;font-weight:500;border:1px solid ${theme.borderColor}"><strong>${time}</strong>${courtInfo} 🎾</span>`;
    })
    .join('');
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

function getShortUrl(url: string): string {
  // Extract the meaningful part: "wapping-gardens/2024-02-06"
  const match = url.match(/\/book\/courts\/(.+)$/);
  return match ? match[1] : url;
}

function groupMatchesByLocationAndDay(matches: Day[]): Record<string, Day[]> {
  const grouped: Record<string, Day[]> = {};
  matches.forEach((m: Day) => {
    const key = `${m.locationName}_${m.dateLabel}`;
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
