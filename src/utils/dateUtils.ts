/**
 * Calculate D+day from anniversary date
 */
export function calculateDDay(anniversaryDate: Date): number {
  const now = new Date();
  const anniversary = new Date(anniversaryDate);

  // Reset time to midnight for accurate day calculation
  now.setHours(0, 0, 0, 0);
  anniversary.setHours(0, 0, 0, 0);

  const diffTime = now.getTime() - anniversary.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1; // D+1 on the first day
}

/**
 * Calculate days until a date
 */
export function daysUntil(targetDate: Date): number {
  const now = new Date();
  const target = new Date(targetDate);

  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Get next occurrence of a yearly anniversary
 */
export function getNextOccurrence(date: Date): Date {
  const now = new Date();
  const thisYear = new Date(date);
  thisYear.setFullYear(now.getFullYear());

  // If this year's date has passed, get next year's
  if (thisYear < now) {
    thisYear.setFullYear(now.getFullYear() + 1);
  }

  return thisYear;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Format date as Korean style (YYYY년 MM월 DD일)
 */
export function formatDateKorean(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year}년 ${month}월 ${day}일`;
}

/**
 * Parse date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}
