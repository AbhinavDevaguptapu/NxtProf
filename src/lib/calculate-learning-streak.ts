import { Timestamp } from "firebase/firestore";

/**
 * Given an array of attendance entries sorted descending by date,
 * and a set of all conducted learning session dates,
 * returns the length of the current “Present” streak for a Monday-Saturday work week.
 * The streak does not break on days where a session was not conducted.
 */
export function calculateLearningStreak(
    entries: { status: string; scheduled_at: Timestamp }[],
    allConductedDates: Set<string>
): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Exclude entries marked as "Missed" and entries on Sundays.
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Exclude entries marked as "Missed" and entries on Sundays.
    const validEntries = entries
        .filter(e => {
            const eventDate = e.scheduled_at.toDate();
            const day = eventDate.getDay();
            const isWorkday = day !== 0; // 0 is Sunday
            const isMissed = e.status === "Missed";
            return !isMissed && isWorkday && eventDate >= startOfMonth;
        })
        // Ensure correct sort just in case
        .sort(
            (a, b) =>
                b.scheduled_at.toDate().getTime() -
                a.scheduled_at.toDate().getTime()
        );

    if (validEntries.length === 0) return 0;

    const mostRecentDate = validEntries[0].scheduled_at.toDate();
    mostRecentDate.setHours(0, 0, 0, 0);

    const conductedDatesArray = Array.from(allConductedDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const lastConductedDateStr = conductedDatesArray[0];

    if (lastConductedDateStr) {
        const lastConductedDate = new Date(lastConductedDateStr);
        lastConductedDate.setHours(0, 0, 0, 0);

        if (mostRecentDate.getTime() < lastConductedDate.getTime()) {
            return 0;
        }
    }

    let streak = 1;
    let prevDate = mostRecentDate;

    for (let i = 1; i < validEntries.length; i++) {
        const currDate = validEntries[i].scheduled_at.toDate();
        currDate.setHours(0, 0, 0, 0);

        const prevDateStr = prevDate.toISOString().split('T')[0];
        const currDateStr = currDate.toISOString().split('T')[0];

        // Check if there were any conducted sessions between the current and previous present dates
        const missedSession = conductedDatesArray.some(dateStr => {
            return dateStr > currDateStr && dateStr < prevDateStr;
        });

        if (!missedSession) {
            streak++;
            prevDate = currDate;
        } else {
            break; // Streak is broken because a session was missed
        }
    }

    return streak;
}