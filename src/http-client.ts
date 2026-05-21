import { Result, CourtCheckError } from './types';

const PROXY_URL = 'https://court-proxy.jmmason95.workers.dev';

/**
 * Determines if an HTTP status code should trigger a retry
 */
function isRetryableStatusCode(statusCode: number): boolean {
  // Retry on server errors and some client errors that might be temporary
  return [
    404, // Not Found - might be temporary
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    520, // Cloudflare Unknown Error
    522, // Cloudflare Connection Timed Out
    524, // Cloudflare Timeout
  ].includes(statusCode);
}

/**
 * Fetches HTML content from a URL with proper error handling and retry logic
 */
export function fetchHtml(
  url: string,
  locationName: string
): Result<string, CourtCheckError> {
  const maxRetries = 2;
  const baseDelay = 1000; // 1 second

  const proxiedUrl = `${PROXY_URL}/?url=${encodeURIComponent(url)}`;
  Logger.log(`Fetching HTML from: ${url} (via proxy)`);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt - 1); // exponential backoff
      Logger.log(
        `Retry attempt ${attempt}/${maxRetries} for ${locationName} after ${delay}ms delay`
      );
      Utilities.sleep(delay);
    }

    let html: string;
    try {
      const resp = UrlFetchApp.fetch(proxiedUrl, {
        muteHttpExceptions: true,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
        },
      });

      const statusCode = resp.getResponseCode();

      // Success case
      if (statusCode === 200) {
        html = resp.getContentText();

        if (attempt > 0) {
          Logger.log(`✅ Success on retry ${attempt} for ${locationName}`);
        }

        // Continue to validation below
      } else {
        // Check if this is a retryable error
        const isRetryable = isRetryableStatusCode(statusCode);

        if (attempt === 0) {
          const bodySnippet = resp
            .getContentText()
            .slice(0, 500)
            .replace(/\s+/g, ' ');
          Logger.log(
            `HTTP ${statusCode} response body (first 500 chars): ${bodySnippet}`
          );
        }

        if (!isRetryable || attempt === maxRetries) {
          return {
            success: false,
            error: {
              type: 'http_error',
              message: `HTTP ${statusCode}${attempt > 0 ? ` (after ${attempt} retries)` : ''}`,
              url,
              statusCode,
              locationName,
            },
          };
        }

        Logger.log(`⚠️ HTTP ${statusCode} for ${locationName}, will retry...`);
        continue; // Try again
      }
    } catch (e) {
      const isLastAttempt = attempt === maxRetries;

      if (isLastAttempt) {
        Logger.log(
          `❌ Fetch error for ${locationName} after ${maxRetries} retries: ${e}`
        );
        return {
          success: false,
          error: {
            type: 'fetch_error',
            message: `${String(e)} (after ${maxRetries} retries)`,
            url,
            locationName,
          },
        };
      }

      Logger.log(`⚠️ Fetch error for ${locationName}, will retry: ${e}`);
      continue; // Try again
    }

    // Basic HTML validation
    if (!/<tr>/.test(html)) {
      return {
        success: false,
        error: {
          type: 'html_parse_error',
          message: 'No <tr> elements found - possible HTML structure change',
          url,
          locationName,
        },
      };
    }

    if (html.length < 5000) {
      Logger.log('⚠️ Warning: Fetched HTML unusually short');
    }

    return {
      success: true,
      data: html,
    };
  }

  // This should never be reached due to the loop structure
  throw new Error('Unexpected: retry loop completed without return');
}
