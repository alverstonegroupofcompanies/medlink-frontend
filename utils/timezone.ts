/**
 * Timezone utility for converting UTC to IST
 * All backend timestamps are in UTC, convert to IST for display
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Parse UTC timestamp and convert to IST Date object
 */
export function parseUTCToIST(utcString: string | null | undefined): Date | null {
    if (!utcString) return null;

    // Parse as UTC explicitly
    const date = new Date(utcString);
    return date;
}

/**
 * Format date in IST for display
 */
export function formatISTDate(
    date: string | Date | null | undefined,
    options?: Intl.DateTimeFormatOptions
): string {
    if (!date) return 'N/A';

    const dateObj = typeof date === 'string' ? parseUTCToIST(date) : date;
    if (!dateObj) return 'N/A';

    return dateObj.toLocaleString('en-IN', {
        timeZone: IST_TIMEZONE,
        ...options
    });
}

/**
 * Format date only (no time)
 */
export function formatISTDateOnly(date: string | Date | null | undefined): string {
    return formatISTDate(date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Format time only (no date)
 */
export function formatISTTimeOnly(date: string | Date | null | undefined): string {
    return formatISTDate(date, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format full date and time
 */
export function formatISTDateTime(date: string | Date | null | undefined): string {
    return formatISTDate(date, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Format with weekday
 */
export function formatISTDateWithWeekday(date: string | Date | null | undefined): string {
    return formatISTDate(date, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

/**
 * Format full date and time with weekday
 */
export function formatISTDateTimeLong(date: string | Date | null | undefined): string {
    return formatISTDate(date, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Get current time in IST
 */
export function getCurrentIST(): Date {
    return new Date();
}
