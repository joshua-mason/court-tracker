import { CourtLocation, LocationSchedule } from './types';

export const COURT_LOCATIONS: CourtLocation[] = [
  {
    id: 'wapping-gardens',
    name: 'Wapping Gardens Tennis Courts',
    baseUrl: 'https://tennistowerhamlets.com',
    path: 'wapping-gardens',
    courts: [
      {
        name: 'Court 1',
        displayName: 'Court 1',
      },
    ],
    htmlSelectors: {
      timeRowRegex:
        '<tr>\\s*<th class="time">(.+?)</th>\\s*<td class="courts">([\\s\\S]*?)</td>\\s*</tr>',
      availableButtonSelector: 'button available',
      courtNameSelector: 'Court 1',
    },
  },
  {
    id: 'king-edward-memorial-park',
    name: 'King Edward Memorial Park',
    baseUrl: 'https://tennistowerhamlets.com',
    path: 'king-edward-memorial-park',
    courts: [
      {
        name: 'Court 1',
        displayName: 'Court 1',
      },
      {
        name: 'Court 2',
        displayName: 'Court 2',
      },
    ],
    htmlSelectors: {
      timeRowRegex:
        '<tr>\\s*<th class="time">(.+?)</th>\\s*<td class="courts">([\\s\\S]*?)</td>\\s*</tr>',
      availableButtonSelector: 'button available',
      courtNameSelector: 'Court',
    },
  },
];

export const LOCATION_SCHEDULES: LocationSchedule[] = [
  {
    locationId: 'wapping-gardens',
    watchDays: [
      {
        day: 'monday',
        hours: ['12pm', '6pm', '7pm', '8pm'],
      },
      {
        day: 'wednesday',
        hours: ['6pm', '7pm', '8pm'],
      },
      {
        day: 'thursday',
        hours: ['6pm', '7pm', '8pm'],
      },
      {
        day: 'friday',
        hours: ['12pm', '6pm', '7pm', '8pm'],
      },
      {
        day: 'saturday',
        hours: [
          '10am',
          '11am',
          '12pm',
          '1pm',
          '2pm',
          '3pm',
          '4pm',
          '5pm',
          '6pm',
          '7pm',
        ],
      },
      {
        day: 'sunday',
        hours: [
          '10am',
          '11am',
          '12pm',
          '1pm',
          '2pm',
          '3pm',
          '4pm',
          '5pm',
          '6pm',
          '7pm',
        ],
      },
    ],
  },
  {
    locationId: 'king-edward-memorial-park',
    watchDays: [
      {
        day: 'monday',
        hours: ['6pm', '7pm', '8pm'],
      },
      {
        day: 'wednesday',
        hours: ['6pm', '7pm', '8pm'],
      },
      {
        day: 'thursday',
        hours: ['6pm', '7pm', '8pm'],
      },
      {
        day: 'friday',
        hours: ['6pm', '7pm', '8pm'],
      },
      {
        day: 'saturday',
        hours: [
          '9am',
          '10am',
          '11am',
          '12pm',
          '1pm',
          '2pm',
          '3pm',
          '4pm',
          '5pm',
        ],
      },
      {
        day: 'sunday',
        hours: [
          '10am',
          '11am',
          '12pm',
          '1pm',
          '2pm',
          '3pm',
          '4pm',
          '5pm',
          '6pm',
          '7pm',
        ],
      },
    ],
  },
];

export const CONFIG = {
  notificationEmail: 'jmmason95@googlemail.com',
};
