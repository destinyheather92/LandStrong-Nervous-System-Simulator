import { createGuidedMeditationManager } from "./guidedMeditation.js";
import { createMeditationAudio } from "./meditationAudio.js";
import {
  safeDisconnectAudioNode,
  safeStopAudioNode,
  setGainValue,
} from "./audioUtils.js";

const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

// This coordinates all ambient audio so sounds only play inside the active regulation screen.
export function createAudioManager({
  dom,
  appState,
  emotionalStates,
  guidedMeditationsByState,
  getPreferences,
  savePreferences,
  applyPreferences,
  getRoutineStateKey,
}) {
  const audioContext = AudioContextConstructor
    ? new AudioContextConstructor()
    : null;
  const audioLifecycle = {
    activeStateKey: null,
    syncToken: 0,
    fadeInSeconds: 0.8,
    fadeOutSeconds: 0.45,
    quickFadeSeconds: 0.18,
  };

  let ambientMasterGain = null;
  let natureGain = null;
  let natureSource = null;
  let natureFilter = null;
  let natureLfo = null;
  let natureLfoGain = null;
  let natureStopTimeoutId = null;
  let activeNatureType = null;
  let forestIntervalId = null;

  function ensureAudioGraph() {
    if (!audioContext) return false;

    if (!ambientMasterGain) {
      ambientMasterGain = audioContext.createGain();
      ambientMasterGain.gain.value = getPreferences().masterVolume / 100;
      ambientMasterGain.connect(audioContext.destination);
    }

    if (!natureGain) {
      natureGain = audioContext.createGain();
      natureGain.gain.value = 0;
      natureGain.connect(ambientMasterGain);
    }

    return true;
  }

  function resumeAudioContext() {
    if (!ensureAudioGraph()) return Promise.resolve(false);

    if (audioContext.state === "suspended") {
      return audioContext
        .resume()
        .then(() => true)
        .catch(() => false);
    }

    return Promise.resolve(true);
  }

  function getActiveAudioStateKey() {
    if (appState.currentSection !== "regulation") {
      return null;
    }

    if (!appState.selectedEmotion || !emotionalStates[appState.selectedEmotion]) {
      return null;
    }

    return appState.selectedEmotion;
  }

  function isAudioForActiveState(stateKey) {
    return Boolean(stateKey && getActiveAudioStateKey() === stateKey);
  }

  function nextAudioSyncToken() {
    audioLifecycle.syncToken += 1;
    return audioLifecycle.syncToken;
  }

  function isCurrentAudioSync(syncToken, stateKey) {
    return (
      syncToken === audioLifecycle.syncToken && isAudioForActiveState(stateKey)
    );
  }

  function createNoiseBuffer() {
    const bufferLength = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(
      1,
      bufferLength,
      audioContext.sampleRate,
    );
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferLength; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  function clearNatureStopTimeout() {
    if (natureStopTimeoutId) {
      clearTimeout(natureStopTimeoutId);
      natureStopTimeoutId = null;
    }
  }

  function stopForestChimeLoop() {
    if (forestIntervalId) {
      clearInterval(forestIntervalId);
      forestIntervalId = null;
    }
  }

  function disconnectNatureSound() {
    if (natureSource) {
      safeStopAudioNode(natureSource);
      safeDisconnectAudioNode(natureSource);
      natureSource = null;
    }

    if (natureFilter) {
      safeDisconnectAudioNode(natureFilter);
      natureFilter = null;
    }

    if (natureLfo) {
      safeStopAudioNode(natureLfo);
      safeDisconnectAudioNode(natureLfo);
      natureLfo = null;
    }

    if (natureLfoGain) {
      safeDisconnectAudioNode(natureLfoGain);
      natureLfoGain = null;
    }

    activeNatureType = null;
  }

  function stopNatureSound(options = {}) {
    const {
      fadeSeconds = audioLifecycle.fadeOutSeconds,
      force = false,
    } = options;

    clearNatureStopTimeout();
    stopForestChimeLoop();

    if (!natureSource && !natureFilter && !natureLfo && !natureLfoGain) {
      if (natureGain) setGainValue(audioContext, natureGain, 0, 0.1);
      activeNatureType = null;
      return;
    }

    if (force || !audioContext || !natureGain || fadeSeconds <= 0.05) {
      if (natureGain) setGainValue(audioContext, natureGain, 0, 0.05);
      disconnectNatureSound();
      return;
    }

    setGainValue(audioContext, natureGain, 0, fadeSeconds);
    natureStopTimeoutId = setTimeout(
      () => {
        natureStopTimeoutId = null;
        disconnectNatureSound();
      },
      (fadeSeconds + 0.15) * 1000,
    );
  }

  function configureNatureTexture() {
    const preferences = getPreferences();
    natureFilter = audioContext.createBiquadFilter();

    if (preferences.natureType === "ocean") {
      natureFilter.type = "lowpass";
      natureFilter.frequency.value = 520;
      natureFilter.Q.value = 0.9;

      natureLfo = audioContext.createOscillator();
      natureLfoGain = audioContext.createGain();
      natureLfo.frequency.value = 0.08;
      natureLfoGain.gain.value = 260;
      natureLfo.connect(natureLfoGain);
      natureLfoGain.connect(natureFilter.frequency);
      natureLfo.start();
    } else if (preferences.natureType === "forest") {
      natureFilter.type = "bandpass";
      natureFilter.frequency.value = 1450;
      natureFilter.Q.value = 0.7;
      forestIntervalId = setInterval(playForestChime, 4200);
    } else if (preferences.natureType === "whiteNoise") {
      natureFilter.type = "lowpass";
      natureFilter.frequency.value = 6500;
      natureFilter.Q.value = 0.5;
    } else if (preferences.natureType === "greenNoise") {
      natureFilter.type = "peaking";
      natureFilter.frequency.value = 800;
      natureFilter.Q.value = 0.7;
      natureFilter.gain.value = 3;

      natureLfo = audioContext.createOscillator();
      natureLfoGain = audioContext.createGain();
      natureLfo.frequency.value = 0.12;
      natureLfoGain.gain.value = 100;
      natureLfo.connect(natureLfoGain);
      natureLfoGain.connect(natureFilter.frequency);
      natureLfo.start();
    } else if (preferences.natureType === "brownNoise") {
      natureFilter.type = "lowpass";
      natureFilter.frequency.value = 280;
      natureFilter.Q.value = 0.8;

      natureLfo = audioContext.createOscillator();
      natureLfoGain = audioContext.createGain();
      natureLfo.frequency.value = 0.06;
      natureLfoGain.gain.value = 120;
      natureLfo.connect(natureLfoGain);
      natureLfoGain.connect(natureFilter.frequency);
      natureLfo.start();
    } else {
      natureFilter.type = "highpass";
      natureFilter.frequency.value = 900;
      natureFilter.Q.value = 0.5;
    }
  }

  function playForestChime() {
    const preferences = getPreferences();

    if (
      !audioContext ||
      !natureGain ||
      !getActiveAudioStateKey() ||
      !preferences.soundEnabled ||
      !preferences.natureEnabled ||
      preferences.natureType !== "forest"
    ) {
      return;
    }

    const chime = audioContext.createOscillator();
    const chimeGain = audioContext.createGain();
    const frequency = 820 + Math.random() * 540;

    chime.type = "sine";
    chime.frequency.value = frequency;
    chimeGain.gain.value = 0;
    chime.connect(chimeGain);
    chimeGain.connect(natureGain);

    chime.start();
    chimeGain.gain.linearRampToValueAtTime(0.012, audioContext.currentTime + 0.08);
    chimeGain.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.7);
    chime.stop(audioContext.currentTime + 0.8);
  }

  function startNatureSound() {
    if (!ensureAudioGraph()) return;

    clearNatureStopTimeout();
    stopForestChimeLoop();
    disconnectNatureSound();
    configureNatureTexture();

    natureSource = audioContext.createBufferSource();
    natureSource.buffer = createNoiseBuffer();
    natureSource.loop = true;
    natureSource.connect(natureFilter);
    natureFilter.connect(natureGain);
    natureSource.start();
    activeNatureType = getPreferences().natureType;
  }

  function updateNatureSound(options = {}) {
    const {
      fadeInSeconds = audioLifecycle.fadeInSeconds,
      fadeOutSeconds = audioLifecycle.fadeOutSeconds,
    } = options;
    const preferences = getPreferences();

    if (
      !getActiveAudioStateKey() ||
      !preferences.soundEnabled ||
      !preferences.natureEnabled
    ) {
      stopNatureSound({ fadeSeconds: fadeOutSeconds });
      return;
    }

    clearNatureStopTimeout();

    if (!natureSource || activeNatureType !== preferences.natureType) {
      startNatureSound();
    }

    const natureLevel = 0.16 * (preferences.natureVolume / 100);
    setGainValue(audioContext, natureGain, natureLevel, fadeInSeconds);
  }

  function updateSoundStatus() {
    if (!dom.soundStatus) return;

    const activeStateKey = getActiveAudioStateKey();
    const preferences = getPreferences();

    if (!activeStateKey) {
      dom.soundStatus.textContent =
        "Sound is paused until you enter a regulation environment.";
      return;
    }

    if (!preferences.soundEnabled) {
      dom.soundStatus.textContent =
        "Sound is off. Your visual routine stays active.";
      return;
    }

    const activeLayers = [];
    if (preferences.natureEnabled && natureSource) {
      activeLayers.push(preferences.natureType);
    }
    if (preferences.meditationEnabled && meditationAudio.getCurrentSound()) {
      activeLayers.push("meditation");
    }
    if (
      preferences.guidedMeditationEnabled &&
      guidedMeditation.isPlaying()
    ) {
      activeLayers.push("guided voice");
    }

    dom.soundStatus.textContent = activeLayers.length
      ? `Playing ${activeLayers.join(" + ")}.`
      : "Sound is on, with all layers muted.";
  }

  const guidedMeditation = createGuidedMeditationManager({
    dom,
    guidedMeditationsByState,
    getPreferences,
    savePreferences,
    applyPreferences,
    getActiveAudioStateKey,
    getRoutineStateKey,
    updateSoundStatus,
  });

  const meditationAudio = createMeditationAudio({
    audioContext,
    getAmbientMasterGain: () => ambientMasterGain,
    getPreferences,
    getSyncToken: () => audioLifecycle.syncToken,
    isAudioForActiveState,
    isCurrentAudioSync,
    resumeAudioContext,
    updateSoundStatus,
  });

  function stopActiveSoundscape(options = {}) {
    const {
      fadeSeconds = audioLifecycle.fadeOutSeconds,
      force = false,
      guidedMessage = "Guided voice will follow the selected state.",
      updateStatus = true,
    } = options;
    const appliedFadeSeconds = force
      ? Math.min(fadeSeconds, audioLifecycle.quickFadeSeconds)
      : fadeSeconds;

    nextAudioSyncToken();
    audioLifecycle.activeStateKey = null;

    if (ambientMasterGain && audioContext) {
      setGainValue(
        audioContext,
        ambientMasterGain,
        0,
        Math.max(appliedFadeSeconds, 0.05),
      );
    }

    stopNatureSound({ fadeSeconds: appliedFadeSeconds, force });
    meditationAudio.stopMeditationSound({ fadeSeconds: appliedFadeSeconds });
    guidedMeditation.stopGuidedMeditation(guidedMessage);

    if (updateStatus) updateSoundStatus();
  }

  function updateSoundscape(options = {}) {
    const {
      fadeInSeconds = audioLifecycle.fadeInSeconds,
      fadeOutSeconds = audioLifecycle.fadeOutSeconds,
      inactiveMessage = "Guided voice will follow the selected state.",
    } = options;
    const activeStateKey = getActiveAudioStateKey();
    const preferences = getPreferences();

    if (!activeStateKey) {
      stopActiveSoundscape({
        fadeSeconds: fadeOutSeconds,
        guidedMessage: inactiveMessage,
      });
      return;
    }

    const syncToken = nextAudioSyncToken();
    audioLifecycle.activeStateKey = activeStateKey;

    if (!ensureAudioGraph()) {
      if (dom.soundStatus) {
        dom.soundStatus.textContent =
          preferences.guidedMeditationEnabled &&
          guidedMeditation.supportsGuidedMeditation()
            ? "Guided voice can play; ambient audio is unavailable."
            : "Audio is unavailable in this browser.";
      }
      return;
    }

    if (!preferences.soundEnabled) {
      setGainValue(audioContext, ambientMasterGain, 0, fadeOutSeconds);
      stopNatureSound({ fadeSeconds: fadeOutSeconds });
      meditationAudio.stopMeditationSound({ fadeSeconds: fadeOutSeconds });
      guidedMeditation.stopGuidedMeditation("Sound is off. Guided voice is paused.");
      updateSoundStatus();
      return;
    }

    resumeAudioContext().then((isReady) => {
      if (!isReady || !isCurrentAudioSync(syncToken, activeStateKey)) return;

      setGainValue(
        audioContext,
        ambientMasterGain,
        preferences.masterVolume / 100,
        fadeInSeconds,
      );
      updateNatureSound({ fadeInSeconds, fadeOutSeconds });

      if (
        !preferences.guidedMeditationEnabled &&
        guidedMeditation.isPlaying()
      ) {
        guidedMeditation.stopGuidedMeditation();
      }

      const currentMeditationSound = meditationAudio.getCurrentSound();

      if (!preferences.meditationEnabled) {
        meditationAudio.stopMeditationSound({ fadeSeconds: fadeOutSeconds });
      } else if (
        activeStateKey &&
        (!currentMeditationSound ||
          currentMeditationSound.stateKey !== activeStateKey)
      ) {
        meditationAudio.playMeditationSound(activeStateKey);
      } else {
        meditationAudio.updateMeditationVolume();
      }

      updateSoundStatus();
    });
  }

  function pauseAudioForInactiveDocument(force = false) {
    stopActiveSoundscape({
      fadeSeconds: force ? 0.08 : audioLifecycle.quickFadeSeconds,
      force,
      guidedMessage: "Guided voice will follow the selected state.",
      updateStatus: false,
    });
  }

  return {
    audioLifecycle,
    getActiveAudioStateKey,
    pauseAudioForInactiveDocument,
    stopActiveSoundscape,
    stopGuidedMeditation: guidedMeditation.stopGuidedMeditation,
    stopNatureSound,
    toggleGuidedMeditation: guidedMeditation.toggleGuidedMeditation,
    updateGuidedMeditationControls: guidedMeditation.updateGuidedMeditationControls,
    updateSoundscape,
    updateSoundStatus,
  };
}
