import { CourtLocation, LocationSchedule } from "./types";

export const COURT_LOCATIONS: CourtLocation[] = [
  {
    id: "wapping-gardens",
    name: "Wapping Gardens Tennis Courts",
    baseUrl: "https://tennistowerhamlets.com",
    path: "wapping-gardens",
    courts: [
      {
        name: "Court 1",
        displayName: "Court 1"
      }
    ],
    htmlSelectors: {
      timeRowRegex: '<tr>\\s*<th class="time">(.+?)</th>\\s*<td class="courts">([\\s\\S]*?)</td>\\s*</tr>',
      availableButtonSelector: "button available",
      courtNameSelector: "Court 1"
    }
  }
];

export const LOCATION_SCHEDULES: LocationSchedule[] = [
  {
    locationId: "wapping-gardens",
    watchDays: [
      {
        weekdayIndex: 1,
        label: "Monday",
        hours: ["12pm", "1pm", "2pm", "6pm", "7pm"],
      },
      {
        weekdayIndex: 5,
        label: "Friday",
        hours: ["12pm", "1pm", "2pm", "5pm", "6pm", "7pm"],
      },
      {
        weekdayIndex: 6,
        label: "Saturday",
        hours: [
          "8am",
          "9am",
          "10am",
          "11am",
          "12pm",
          "1pm",
          "2pm",
          "3pm",
          "4pm",
          "5pm",
        ],
      },
      {
        weekdayIndex: 0,
        label: "Sunday",
        hours: [
          "8am",
          "9am",
          "10am",
          "11am",
          "12pm",
          "1pm",
          "2pm",
          "3pm",
          "4pm",
          "5pm",
          "6pm",
          "7pm",
        ],
      },
    ],
  }
];

export const CONFIG = {
  notificationEmail: "jmmason95@googlemail.com",
};
  