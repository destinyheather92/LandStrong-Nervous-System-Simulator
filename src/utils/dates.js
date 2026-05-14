// This gives stored events a friendly label without exposing raw timestamps meaning the user can see when they last checked in or did a breathing session without needing to understand date formatting. It also handles invalid or missing dates gracefully by showing "Recently" instead, which keeps the UI user-friendly and avoids confusion if the stored value is corrupted or not set.
export function formatStoredDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normalizeStoredDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

// Affirmations use this so a daily message stays stable during the same day.
export function isSameDay(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}
