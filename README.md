## Court Tracker

Get notified when tennis courts you care about open up due to cancellations. Zero infrastructure - runs entirely on Google Apps Script.

### Overview

- **What it does**: Checks booking pages for specific locations, days, and hours; emails you when new slots appear.
- **Noise control**: Only sends when results change (hash-based diff) to avoid duplicates.
- **Reliable**: Retries on transient HTTP errors and sends a weekly error summary.
- **Stack**: TypeScript → Rollup → Google Apps Script via `clasp`.

### Getting started (3 steps)

1. Configure your preferences in `src/config.ts`

```ts
export const CONFIG = { notificationEmail: 'you@example.com' };

// Locations + selectors (add/edit as needed)
export const COURT_LOCATIONS = [
  /* ... */
];

// Days/hours to watch
export const LOCATION_SCHEDULES = [
  /* ... */
];
```

2. Build and deploy to Apps Script

```bash
npm install
npm run build
npx clasp login
npx clasp create --type standalone --title "Court Tracker"
npm run deploy
```

3. Schedule hourly checks

- In Apps Script: Triggers → Add Trigger → Function `checkCourtAvailability` → Time-driven → Every hour.

### How it works (at a glance)

- Builds target dates for configured days (includes today when relevant).
- Fetches booking pages with retry/backoff and basic HTML validation.
- Parses available slots by time/court via lightweight selectors.
- Compares to last results (MD5 hash) and sends a single HTML email when something changes.
- Persists state and accumulates errors in `PropertiesService`; sends a weekly error summary.
