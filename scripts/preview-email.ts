import * as fs from 'fs';
import { Day } from '../src/types';

// Import the built code
const buildCode = fs.readFileSync('./build/main.js', 'utf8');

// Create mock data
const mockData: Day[] = [
  {
    dateLabel: 'monday (2024-02-06)',
    time: '12 PM',
    url: 'https://tennistowerhamlets.com/book/courts/wapping-gardens/2024-02-06',
    locationName: 'Wapping Gardens Tennis Courts',
    courtName: 'Court 1',
  },
  {
    dateLabel: 'monday (2024-02-06)',
    time: '1 PM',
    url: 'https://tennistowerhamlets.com/book/courts/wapping-gardens/2024-02-06',
    locationName: 'Wapping Gardens Tennis Courts',
    courtName: 'Court 2',
  },
  {
    dateLabel: 'tuesday (2024-02-07)',
    time: '12 PM',
    url: 'https://tennistowerhamlets.com/book/courts/wapping-gardens/2024-02-07',
    locationName: 'Wapping Gardens Tennis Courts',
    courtName: 'Court 1',
  },
  {
    dateLabel: 'friday (2024-02-09)',
    time: '10 AM',
    url: 'https://tennistowerhamlets.com/book/courts/king-edward-memorial-park/2024-02-09',
    locationName: 'King Edward Memorial Park',
    courtName: 'Court 1',
  },
  {
    dateLabel: 'friday (2024-02-09)',
    time: '11 AM',
    url: 'https://tennistowerhamlets.com/book/courts/king-edward-memorial-park/2024-02-09',
    locationName: 'King Edward Memorial Park',
    courtName: 'Court 1',
  },
  {
    dateLabel: 'saturday (2024-02-10)',
    time: '2 PM',
    url: 'https://tennistowerhamlets.com/book/courts/king-edward-memorial-park/2024-02-10',
    locationName: 'King Edward Memorial Park',
    courtName: 'Court 2',
  },
];

// Execute the build code to get the GAS object
const GAS = eval(`(function() { ${buildCode}; return GAS; })()`);

// Generate HTML using the actual built function
const html = GAS.generateHtmlEmail(mockData);

// Write to preview file
fs.writeFileSync('./preview.html', html);

console.log('✅ HTML preview generated: ./preview.html');
console.log('📖 Open the file in your browser to preview!');
console.log(`\n📧 Preview shows ${mockData.length} mock court slots with alternating themes`);