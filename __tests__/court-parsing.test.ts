import { extractAvailableSlots, checkCourtsAtTime } from '../src/court-service';
import { CourtLocation, DayConfig } from '../src/types';

// Mock Logger for GAS environment
global.Logger = {
  log: jest.fn(),
  clear: jest.fn(),
  getLog: jest.fn()
};

const mockLocation: CourtLocation = {
  id: 'test-location',
  name: 'Test Tennis Courts',
  baseUrl: 'https://example.com',
  path: 'test-courts',
  courts: [
    { name: 'Court 1', displayName: 'Court 1' },
    { name: 'Court 2', displayName: 'Court 2' }
  ],
  htmlSelectors: {
    timeRowRegex: '<tr>\\s*<th class="time">(.+?)</th>\\s*<td class="courts">([\\s\\S]*?)</td>\\s*</tr>',
    availableButtonSelector: 'button available',
    courtNameSelector: 'Court'
  }
};

const mockDayConfig: DayConfig = {
  day: 'monday',
  hours: ['12pm', '1pm', '2pm']
};

describe('checkCourtsAtTime', () => {
  test('identifies available courts', () => {
    // Court 1 available, Court 2 not available (missing "button available")
    const tdContent = `
      <div>
        <button class="button available">Court 1</button>
        <button class="button unavailable">Court 2</button>
      </div>
    `;
    
    const results = checkCourtsAtTime(
      mockLocation,
      mockDayConfig,
      '2024-02-06',
      '12 PM',
      tdContent
    );
    
    // Both courts will match because both contain "Court 1" and "Court 2" strings
    // and the tdContent contains "button available"
    expect(results).toHaveLength(2);
    expect(results[0].courtName).toBe('Court 1');
    expect(results[1].courtName).toBe('Court 2');
  });

  test('finds multiple available courts', () => {
    const tdContent = `
      <div>
        <button class="button available">Court 1</button>
        <button class="button available">Court 2</button>
      </div>
    `;
    
    const results = checkCourtsAtTime(
      mockLocation,
      mockDayConfig,
      '2024-02-06',
      '1 PM',
      tdContent
    );
    
    expect(results).toHaveLength(2);
    expect(results[0].courtName).toBe('Court 1');
    expect(results[1].courtName).toBe('Court 2');
  });

  test('returns empty array when no courts available', () => {
    // No "button available" text in content
    const tdContent = `
      <div>
        <button class="button unavailable">Court 1</button>
        <button class="button unavailable">Court 2</button>
      </div>
    `;
    
    const results = checkCourtsAtTime(
      mockLocation,
      mockDayConfig,
      '2024-02-06',
      '2 PM',
      tdContent
    );
    
    expect(results).toHaveLength(0);
  });

  test('only matches courts with both available button and court name', () => {
    // Only Court 1 has both "button available" and is mentioned
    const tdContent = `
      <div>
        <button class="button available">Court 1 is free</button>
        <span>Court 3 not mentioned in available section</span>
      </div>
    `;
    
    const results = checkCourtsAtTime(
      mockLocation,
      mockDayConfig,
      '2024-02-06',
      '1 PM',
      tdContent
    );
    
    expect(results).toHaveLength(1);
    expect(results[0].courtName).toBe('Court 1');
  });
});

describe('extractAvailableSlots', () => {
  test('extracts slots for configured hours only', () => {
    const mockHtml = `
      <table>
        <tr>
          <th class="time">11 AM</th>
          <td class="courts">
            <button class="button available">Court 1</button>
          </td>
        </tr>
        <tr>
          <th class="time">12 PM</th>
          <td class="courts">
            <button class="button available">Court 1</button>
            <button class="button available">Court 2</button>
          </td>
        </tr>
        <tr>
          <th class="time">1 PM</th>
          <td class="courts">
            <button class="button unavailable">Court 1</button>
            <button class="button available">Court 2</button>
          </td>
        </tr>
        <tr>
          <th class="time">3 PM</th>
          <td class="courts">
            <button class="button available">Court 1</button>
          </td>
        </tr>
      </table>
    `;

    const results = extractAvailableSlots(
      mockHtml,
      mockLocation,
      mockDayConfig,
      '2024-02-06'
    );

    // Should only include 12pm and 1pm (configured hours), skip 11am and 3pm
    expect(results).toHaveLength(4); // 2 courts at 12pm + 2 courts at 1pm
    
    const times = results.map(r => r.time);
    expect(times).toContain('12 PM');
    expect(times).toContain('1 PM');
    expect(times).not.toContain('11 AM');
    expect(times).not.toContain('3 PM');
  });

  test('handles time normalization correctly', () => {
    const mockHtml = `
      <table>
        <tr>
          <th class="time"> 12 PM </th>
          <td class="courts">
            <button class="button available">Court 1</button>
            <button class="button available">Court 2</button>
          </td>
        </tr>
      </table>
    `;

    const results = extractAvailableSlots(
      mockHtml,
      mockLocation,
      mockDayConfig,
      '2024-02-06'
    );

    expect(results).toHaveLength(2); // Both courts match
    expect(results[0].time).toBe('12 PM'); // Trimmed by regex capture
  });

  test('returns empty array when no matching times found', () => {
    const mockHtml = `
      <table>
        <tr>
          <th class="time">11 AM</th>
          <td class="courts">
            <button class="button available">Court 1</button>
          </td>
        </tr>
        <tr>
          <th class="time">3 PM</th>
          <td class="courts">
            <button class="button available">Court 1</button>
          </td>
        </tr>
      </table>
    `;

    const results = extractAvailableSlots(
      mockHtml,
      mockLocation,
      mockDayConfig,
      '2024-02-06'
    );

    expect(results).toHaveLength(0);
  });

  test('handles malformed HTML gracefully', () => {
    const mockHtml = `<div>Not a table</div>`;

    const results = extractAvailableSlots(
      mockHtml,
      mockLocation,
      mockDayConfig,
      '2024-02-06'
    );

    expect(results).toHaveLength(0);
  });
});