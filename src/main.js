import { createAudioManager } from "./audio/audioManager.js";
import { createBreathingAnimator } from "./breathing/breathingAnimations.js";
import { createBreathingEngine } from "./breathing/breathingEngine.js";
import { appState } from "./appState.js";
import {
  affirmationsByState,
  emotionalStates,
  guidedMeditationsByState,
} from "./data/emotionalStates.js";
import { dom } from "./domElements.js";
import {
  loadActivity,
  loadPreferences,
  storageKeys,
  writeStorage,
} from "./storageUtils.js";
import {
  createFontScaleManager,
  setupAccessibility,
  setupCustomCursor,
  setupKeyboardNavigation,
} from "./ui/accessibility.js";
import { generateEmotionGrid } from "./ui/emotionGrid.js";
import {
  createParticles,
  refreshParticlesForCurrentSection,
  setupParticleObserver,
} from "./ui/particles.js";
import { createRegulationContent } from "./ui/regulationContent.js";
import { createSectionTransitioner } from "./ui/transitions.js";
import { createWellnessManager } from "./wellnessManager.js";

let userPreferences = loadPreferences();
let activityData = loadActivity();
let emotionSelectionToken = 0;

function getPreferences() {
  return userPreferences;
}

function savePreferences() {
  writeStorage(storageKeys.preferences, userPreferences);
}

function saveActivity() {
  activityData.emotionHistory = activityData.emotionHistory.slice(0, 80);
  activityData.breathingSessions = activityData.breathingSessions.slice(0, 80);
  activityData.appVisits = activityData.appVisits.slice(0, 120);
  writeStorage(storageKeys.activity, activityData);
}

const wellnessManager = createWellnessManager({
  dom,
  appState,
  activityData,
  saveActivity,
  emotionalStates,
  affirmationsByState,
});

const fontScaleManager = createFontScaleManager({
  dom,
  getPreferences,
});

let audioManager = null;

// This applies saved preferences to controls, theme, font size, particles, and audio.
function applyPreferences(options = {}) {
  const { refreshParticles = true, updateAudio = true } = options;

  dom.body.classList.toggle("theme-light", userPreferences.theme === "light");
  dom.body.classList.toggle("theme-dark", userPreferences.theme === "dark");
  dom.documentElement.style.setProperty(
    "--font-scale",
    (userPreferences.fontScale / 100).toFixed(2),
  );
  fontScaleManager.scheduleFontScaleRefresh();

  syncPreferenceControls();
  if (refreshParticles) {
    refreshParticlesForCurrentSection({ dom, appState, emotionalStates });
  }
  if (updateAudio && audioManager) {
    audioManager.updateSoundscape();
  }
}

function syncPreferenceControls() {
  if (dom.themeToggleButton) {
    const isLight = userPreferences.theme === "light";
    dom.themeToggleButton.textContent = isLight ? "Dark Mode" : "Light Mode";
    dom.themeToggleButton.setAttribute("aria-pressed", String(isLight));
  }

  if (dom.soundEnabledToggle) {
    dom.soundEnabledToggle.checked = userPreferences.soundEnabled;
  }
  if (dom.natureSoundToggle) {
    dom.natureSoundToggle.checked = userPreferences.natureEnabled;
  }
  if (dom.meditationSoundToggle) {
    dom.meditationSoundToggle.checked = userPreferences.meditationEnabled;
  }
  if (audioManager) {
    audioManager.updateGuidedMeditationControls();
  }
  if (dom.natureSoundSelect) {
    dom.natureSoundSelect.value = userPreferences.natureType;
  }
  if (dom.masterVolumeInput) {
    dom.masterVolumeInput.value = userPreferences.masterVolume;
  }
  if (dom.natureVolumeInput) {
    dom.natureVolumeInput.value = userPreferences.natureVolume;
  }
  if (dom.meditationVolumeInput) {
    dom.meditationVolumeInput.value = userPreferences.meditationVolume;
  }
  if (dom.fontScaleInput) {
    dom.fontScaleInput.value = userPreferences.fontScale;
  }
}

audioManager = createAudioManager({
  dom,
  appState,
  emotionalStates,
  guidedMeditationsByState,
  getPreferences,
  savePreferences,
  applyPreferences,
  getRoutineStateKey: wellnessManager.getRoutineStateKey,
});

const breathingAnimator = createBreathingAnimator({
  dom,
  getIsBreathingActive: () => appState.isBreathingActive,
});

const breathingEngine = createBreathingEngine({
  dom,
  appState,
  emotionalStates,
  animator: breathingAnimator,
  onBreathingComplete: wellnessManager.trackBreathingSession,
});

const regulationContent = createRegulationContent({ dom });

const sectionTransitioner = createSectionTransitioner({
  dom,
  appState,
  emotionalStates,
  stopActiveSoundscape: (...args) => audioManager.stopActiveSoundscape(...args),
});

function updatePreference(key, value) {
  if (key === "natureType") {
    audioManager.stopNatureSound();
  }

  if (key === "guidedMeditationEnabled" && !value) {
    audioManager.stopGuidedMeditation();
  }

  userPreferences[key] = value;
  savePreferences();

  const soundKeys = [
    "soundEnabled",
    "natureEnabled",
    "meditationEnabled",
    "guidedMeditationEnabled",
    "natureType",
    "masterVolume",
    "natureVolume",
    "meditationVolume",
  ];

  applyPreferences({
    refreshParticles: false,
    updateAudio: soundKeys.includes(key),
  });
}

function bindPreferenceControls() {
  if (dom.themeToggleButton) {
    dom.themeToggleButton.addEventListener("click", () => {
      updatePreference(
        "theme",
        userPreferences.theme === "light" ? "dark" : "light",
      );
    });
  }

  if (dom.soundEnabledToggle) {
    dom.soundEnabledToggle.addEventListener("change", (event) => {
      updatePreference("soundEnabled", event.target.checked);
    });
  }

  if (dom.natureSoundToggle) {
    dom.natureSoundToggle.addEventListener("change", (event) => {
      updatePreference("natureEnabled", event.target.checked);
    });
  }

  if (dom.meditationSoundToggle) {
    dom.meditationSoundToggle.addEventListener("change", (event) => {
      updatePreference("meditationEnabled", event.target.checked);
    });
  }

  if (dom.guidedMeditationToggle) {
    dom.guidedMeditationToggle.addEventListener("change", (event) => {
      updatePreference("guidedMeditationEnabled", event.target.checked);
    });
  }

  if (dom.guidedMeditationButton) {
    dom.guidedMeditationButton.addEventListener(
      "click",
      audioManager.toggleGuidedMeditation,
    );
  }

  if (dom.natureSoundSelect) {
    dom.natureSoundSelect.addEventListener("change", (event) => {
      updatePreference("natureType", event.target.value);
    });
  }

  [
    ["masterVolume", dom.masterVolumeInput],
    ["natureVolume", dom.natureVolumeInput],
    ["meditationVolume", dom.meditationVolumeInput],
    ["fontScale", dom.fontScaleInput],
  ].forEach(([preferenceKey, input]) => {
    if (!input) return;

    input.addEventListener("input", (event) => {
      updatePreference(preferenceKey, Number(event.target.value));
    });
  });

  if (dom.newAffirmationButton) {
    dom.newAffirmationButton.addEventListener("click", () => {
      wellnessManager.showAffirmation(wellnessManager.getRoutineStateKey(), true);
    });
  }

  if (dom.refreshRoutineButton) {
    dom.refreshRoutineButton.addEventListener(
      "click",
      wellnessManager.refreshPersonalRoutine,
    );
  }
}

function setupRegulationEnvironment(emotionKey) {
  const state = emotionalStates[emotionKey];

  dom.regulationSection.className = "regulation-section";
  dom.regulationSection.classList.add("active", state.className);
  dom.currentStateDisplay.textContent = `State: ${state.name}`;

  breathingEngine.setupBreathingExercise(emotionKey);
  regulationContent.setupGroundingTechniques(state);
  regulationContent.setupPrompts(state);
  wellnessManager.loadReflections();
  wellnessManager.showAffirmation(emotionKey);
  wellnessManager.renderPersonalRoutine();
  wellnessManager.renderDashboard();
  wellnessManager.renderTimeline();

  if (dom.guidedMeditationText) {
    dom.guidedMeditationText.textContent = `Guided voice is ready for ${state.name}.`;
  }

  audioManager.updateSoundscape();
}

function selectEmotion(emotionKey, event) {
  const selectionToken = ++emotionSelectionToken;

  if (appState.selectedEmotion && appState.selectedEmotion !== emotionKey) {
    audioManager.stopActiveSoundscape({
      fadeSeconds: audioManager.audioLifecycle.quickFadeSeconds,
      force: true,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
  }

  appState.selectedEmotion = emotionKey;
  wellnessManager.trackEmotionSelection(emotionKey);

  dom.getEmotionCards().forEach((card) => {
    card.classList.remove("active");
  });
  if (event && event.target) {
    const card = event.target.closest(".emotion-card");
    if (card) card.classList.add("active");
  }

  setTimeout(() => {
    if (
      selectionToken !== emotionSelectionToken ||
      appState.selectedEmotion !== emotionKey
    ) {
      return;
    }

    sectionTransitioner.transitionToSection("regulation");
    setupRegulationEnvironment(emotionKey);
  }, 500);
}

function bindPrimaryNavigation() {
  dom.beginButton.addEventListener("click", () => {
    sectionTransitioner.transitionToSection("state");
    generateEmotionGrid({ dom, emotionalStates, onSelectEmotion: selectEmotion });
  });

  dom.backButton.addEventListener("click", () => {
    breathingEngine.stopBreathingExercise();
    audioManager.stopActiveSoundscape({
      fadeSeconds: audioManager.audioLifecycle.fadeOutSeconds,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
    dom.breathingText.textContent = "Get ready...";
    dom.breathingCount.textContent = "";
    sectionTransitioner.transitionToSection("state");
  });

  dom.resetButton.addEventListener("click", () => {
    appState.selectedEmotion = null;
    breathingEngine.stopBreathingExercise();
    dom.breathingText.textContent = "Get ready...";
    dom.breathingCount.textContent = "";
    dom.journalInput.value = "";
    dom.charCount.textContent = "0";

    audioManager.stopActiveSoundscape({
      fadeSeconds: audioManager.audioLifecycle.quickFadeSeconds,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
    sectionTransitioner.transitionToSection("hero");
  });
}

function bindPageLifecycleControls() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      audioManager.pauseAudioForInactiveDocument();
      return;
    }

    audioManager.updateSoundscape({
      fadeInSeconds: audioManager.audioLifecycle.fadeInSeconds,
    });
  });

  window.addEventListener("pagehide", () => {
    audioManager.pauseAudioForInactiveDocument(true);
  });

  window.addEventListener("pageshow", () => {
    audioManager.updateSoundscape({
      fadeInSeconds: audioManager.audioLifecycle.fadeInSeconds,
    });
  });
}

// This is the single startup path for the whole app.
export function initializeApp() {
  applyPreferences({ refreshParticles: false, updateAudio: false });
  bindPreferenceControls();
  bindPrimaryNavigation();
  wellnessManager.bindJournalControls();
  fontScaleManager.setupFontScaleObserver();
  wellnessManager.trackAppVisit();

  dom.heroSection.classList.add("active");
  createParticles(dom.particlesHero, 30);

  setupAccessibility(dom);
  setupCustomCursor(dom);
  setupKeyboardNavigation({ dom, appState });
  setupParticleObserver({ dom, appState, emotionalStates });
  bindPageLifecycleControls();

  wellnessManager.renderInitialWellness();
  audioManager.updateSoundStatus();
  fontScaleManager.scheduleFontScaleRefresh();

  console.log("LandStrong Nervous System Simulator initialized");
}
