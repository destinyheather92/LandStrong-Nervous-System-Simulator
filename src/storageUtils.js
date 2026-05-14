export const storageKeys = {
  preferences: "landstrongPreferences",
  activity: "landstrongActivity",
  lastAffirmation: "landstrongLastAffirmation",
  reflections: "landstrongReflections",
};

export const defaultPreferences = {
  theme: "dark",
  fontScale: 100,
  soundEnabled: false,
  natureEnabled: false,
  meditationEnabled: true,
  guidedMeditationEnabled: false,
  natureType: "rain",
  masterVolume: 35,
  natureVolume: 35,
  meditationVolume: 25,
};

export const defaultActivity = {
  emotionHistory: [],
  breathingSessions: [],
  appVisits: [],
};

// This reads saved browser data safely so a bad stored value cannot crash the app.
export function readStorage(key, fallback) {
  try {
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : fallback;
  } catch (error) {
    console.log("Storage read failed:", error);
    return fallback;
  }
}

// This writes saved browser data safely and quietly handles storage limits.
export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log("Storage write failed:", error);
  }
}

// Preferences are merged with defaults so older saved settings still work after updates.
export function loadPreferences() {
  return {
    ...defaultPreferences,
    ...readStorage(storageKeys.preferences, {}),
  };
}

// Activity arrays are checked before use because localStorage can be edited or corrupted.
export function loadActivity() {
  const storedActivity = readStorage(storageKeys.activity, {});

  return {
    emotionHistory: Array.isArray(storedActivity.emotionHistory)
      ? storedActivity.emotionHistory
      : [],
    breathingSessions: Array.isArray(storedActivity.breathingSessions)
      ? storedActivity.breathingSessions
      : [],
    appVisits: Array.isArray(storedActivity.appVisits)
      ? storedActivity.appVisits
      : [],
  };
}
