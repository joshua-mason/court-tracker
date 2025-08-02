import { Result, CourtCheckError } from "./types";

/**
 * Fetches HTML content from a URL with proper error handling
 */
export function fetchHtml(url: string, locationName: string): Result<string, CourtCheckError> {
  Logger.log(`Fetching HTML from: ${url}`);
  
  let html: string;
  try {
    const resp = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      },
    });
    
    if (resp.getResponseCode() !== 200) {
      return {
        success: false,
        error: {
          type: 'http_error',
          message: `HTTP ${resp.getResponseCode()}`,
          url,
          statusCode: resp.getResponseCode(),
          locationName
        }
      };
    }
    
    html = resp.getContentText();
  } catch (e) {
    Logger.log(`Fetch error for ${locationName}: ${e}`);
    return {
      success: false,
      error: {
        type: 'fetch_error',
        message: String(e),
        url,
        locationName
      }
    };
  }

  // Basic HTML validation
  if (!/<tr>/.test(html)) {
    return {
      success: false,
      error: {
        type: 'html_parse_error',
        message: 'No <tr> elements found - possible HTML structure change',
        url,
        locationName
      }
    };
  }

  if (html.length < 5000) {
    Logger.log("⚠️ Warning: Fetched HTML unusually short");
  }

  return {
    success: true,
    data: html
  };
}