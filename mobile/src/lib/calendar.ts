import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

// "Add to calendar" for native screens. There is no public API for Apple's
// own "Invites" app (it's a closed, iPhone-only consumer app — see the
// research note in the PR this shipped with), so this uses the real,
// documented integration surface any app has: EventKit on iOS / the
// Calendar provider on Android, via expo-calendar.
export interface AddToCalendarEvent {
  title: string;
  startsAt: string | Date;
  /** Defaults to startsAt + 3 hours when omitted. Ignored when allDay is true. */
  endsAt?: string | Date | null;
  location?: string | null;
  notes?: string | null;
  /** For date-only values (e.g. a vendor inquiry's event_date) with no specific time. */
  allDay?: boolean;
}

async function getDefaultCalendarId(): Promise<string | null> {
  if (Platform.OS === "ios") {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    return defaultCal?.id ?? null;
  }
  // Android has no single "default" calendar — pick the first calendar
  // whose account owns it and allows writes.
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find((c: Calendar.Calendar) => c.allowsModifications) ?? calendars[0];
  return writable?.id ?? null;
}

/**
 * Requests calendar permission (if needed) and adds a single event,
 * showing a friendly alert on success or failure. Safe to call directly
 * from a button's onPress — it never throws.
 */
export async function addEventToCalendar(event: AddToCalendarEvent): Promise<void> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Calendar access needed",
        "Enable calendar access for Sanatix in Settings to add this to your calendar."
      );
      return;
    }

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert("Couldn't add to calendar", "No writable calendar was found on this device.");
      return;
    }

    const startDate = new Date(event.startsAt);
    const endDate = event.allDay
      ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      : event.endsAt
        ? new Date(event.endsAt)
        : new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: event.title,
      startDate,
      endDate,
      allDay: event.allDay ?? false,
      location: event.location ?? undefined,
      notes: event.notes ?? undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    Alert.alert("Added to calendar", `"${event.title}" was added to your calendar.`);
  } catch {
    Alert.alert("Couldn't add to calendar", "Something went wrong — please try again.");
  }
}
