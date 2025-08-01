export type Day = {
  dateLabel: string;
  time: string;
  url: string;
};

export type DayConfig = {
  weekdayIndex: number;
  label: string;
  hours: string[];
};

export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type CourtCheckError = {
  type: 'fetch_error' | 'html_parse_error' | 'http_error';
  message: string;
  url?: string;
  statusCode?: number;
};