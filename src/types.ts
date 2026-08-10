export type Day = {
  dateLabel: string;
  time: string;
  url: string;
  locationName: string;
  courtName: string;
};

export type DayConfig = {
  day:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday';
  hours: string[];
  /** How often this day's schedule should be re-checked, in hours. Defaults to 1 (every tick). */
  checkEveryHours?: number;
};

export type CourtLocation = {
  id: string;
  name: string;
  baseUrl: string;
  path: string;
  courts: CourtConfig[];
  htmlSelectors: HtmlSelectors;
};

export type CourtConfig = {
  name: string;
  displayName: string;
};

export type HtmlSelectors = {
  timeRowRegex: string;
  availableButtonSelector: string;
  courtNameSelector: string;
};

export type LocationSchedule = {
  locationId: string;
  watchDays: DayConfig[];
};

export type Result<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export type CourtCheckError = {
  type: 'fetch_error' | 'html_parse_error' | 'http_error' | 'bot_challenge';
  message: string;
  url?: string;
  statusCode?: number;
  locationName?: string;
  courtName?: string;
};
