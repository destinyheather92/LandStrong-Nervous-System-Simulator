function isAppleTouchDevice() {
  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";

  return (
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function getVoiceSearchText(voice) {
  return [
    voice.name,
    voice.voiceURI,
    voice.lang,
    voice.localService ? "local" : "",
    voice.default ? "default" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreMeditationVoice(voice, index) {
  const searchText = getVoiceSearchText(voice);
  const language = (voice.lang || "").toLowerCase();
  const isiOS = isAppleTouchDevice();
  let score = 0;

  if (/en[-_]?gb|united kingdom|british|uk english/.test(searchText)) {
    score += 80;
  } else if (/en[-_]?(ie|au|nz)|irish|australian|new zealand/.test(searchText)) {
    score += 36;
  } else if (/^en([_-]|$)/.test(language) || /english/.test(searchText)) {
    score += 18;
  } else {
    score -= 90;
  }

  if (
    /google.*uk.*english.*female|google.*english.*united kingdom.*female|microsoft.*(sonia|libby)|\b(serena|kate|martha)\b/.test(
      searchText,
    )
  ) {
    score += 120;
  }

  if (
    /\b(moira|fiona|karen|ava|victoria|samantha|allison|susan|zoe)\b|microsoft.*(aria|jenny|zira)|google.*female/.test(
      searchText,
    )
  ) {
    score += 52;
  }

  if (/female|woman|natural|neural|premium|enhanced|siri/.test(searchText)) {
    score += 28;
  }

  if (isiOS) {
    if (/\b(serena|kate|martha|moira|fiona|karen)\b/.test(searchText)) {
      score += 42;
    }

    if (/\bsamantha\b/.test(searchText)) {
      score -= 16;
    }
  }

  if (
    /\b(daniel|fred|alex|tom|thomas|xander|oliver|arthur|aaron|nathan|david|mark|george)\b|\bmale\b/.test(
      searchText,
    )
  ) {
    score -= 70;
  }

  if (/robot|compact/.test(searchText)) {
    score -= 30;
  }

  return score - index / 1000;
}

function getGuidedMeditationSpeechSettings() {
  if (isAppleTouchDevice()) {
    return {
      rate: 0.84,
      pitch: 1,
      volumeScale: 0.82,
      fallbackLanguage: "en-GB",
    };
  }

  return {
    rate: 0.72,
    pitch: 0.88,
    volumeScale: 0.9,
    fallbackLanguage: "en-GB",
  };
}

function calculateMeditationPauseDuration(text) {
  const baseMs = 3500;
  const extraMs = Math.floor(text.length / 100) * 500;
  return baseMs + Math.min(extraMs, 1500);
}

// This controls the optional spoken meditation guidance.
export function createGuidedMeditationManager({
  dom,
  guidedMeditationsByState,
  getPreferences,
  savePreferences,
  applyPreferences,
  getActiveAudioStateKey,
  getRoutineStateKey,
  updateSoundStatus,
}) {
  let selectedMeditationVoice = null;
  let guidedMeditationTimeoutId = null;
  let guidedMeditationLineIndex = 0;
  let isGuidedMeditationPlaying = false;

  function supportsGuidedMeditation() {
    return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  function isAudioForActiveState(stateKey) {
    return Boolean(stateKey && getActiveAudioStateKey() === stateKey);
  }

  function selectMeditationVoice() {
    if (!supportsGuidedMeditation()) return null;

    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    const englishVoices = voices.filter((voice) => {
      const language = (voice.lang || "").toLowerCase();
      const searchText = getVoiceSearchText(voice);

      return (
        !language ||
        /^en([_-]|$)/.test(language) ||
        /english|british|united kingdom|serena|kate|martha|moira|fiona|karen|samantha/.test(
          searchText,
        )
      );
    });
    const candidates = englishVoices.length ? englishVoices : voices;

    return candidates
      .map((voice, index) => ({
        voice,
        score: scoreMeditationVoice(voice, index),
      }))
      .sort((a, b) => b.score - a.score)[0].voice;
  }

  function preloadVoiceSelection() {
    if (!supportsGuidedMeditation()) return;

    window.speechSynthesis.onvoiceschanged = () => {
      selectedMeditationVoice = selectMeditationVoice();
    };
    selectedMeditationVoice = selectMeditationVoice();
  }

  function getGuidedMeditationStateKey() {
    return getActiveAudioStateKey() || getRoutineStateKey();
  }

  function getGuidedMeditationLines(stateKey) {
    return guidedMeditationsByState[stateKey] || guidedMeditationsByState.calm;
  }

  function updateGuidedMeditationControls() {
    const preferences = getPreferences();

    if (dom.guidedMeditationToggle) {
      dom.guidedMeditationToggle.checked = preferences.guidedMeditationEnabled;
    }

    if (dom.guidedMeditationButton) {
      dom.guidedMeditationButton.textContent = isGuidedMeditationPlaying
        ? "Stop Guidance"
        : "Play Guidance";
    }
  }

  function stopGuidedMeditation(message = "Guided voice is paused.") {
    if (guidedMeditationTimeoutId) {
      clearTimeout(guidedMeditationTimeoutId);
      guidedMeditationTimeoutId = null;
    }

    if (supportsGuidedMeditation()) {
      window.speechSynthesis.cancel();
    }

    isGuidedMeditationPlaying = false;
    updateGuidedMeditationControls();

    if (dom.guidedMeditationText) {
      dom.guidedMeditationText.textContent = message;
    }
  }

  function speakGuidedMeditationLine(stateKey) {
    if (!isGuidedMeditationPlaying) return;

    if (!isAudioForActiveState(stateKey)) {
      stopGuidedMeditation("Guided voice will follow the selected state.");
      return;
    }

    const lines = getGuidedMeditationLines(stateKey);

    if (guidedMeditationLineIndex >= lines.length) {
      stopGuidedMeditation("Guidance complete. Stay with the breath you found.");
      return;
    }

    const preferences = getPreferences();
    const line = lines[guidedMeditationLineIndex];
    const utterance = new SpeechSynthesisUtterance(line);
    const speechSettings = getGuidedMeditationSpeechSettings();
    const voiceVolume =
      (preferences.masterVolume / 100) * (preferences.meditationVolume / 100);

    // A warm available voice makes browser speech feel more like guidance.
    if (selectedMeditationVoice) {
      utterance.voice = selectedMeditationVoice;
    }
    utterance.lang =
      (selectedMeditationVoice && selectedMeditationVoice.lang) ||
      speechSettings.fallbackLanguage;

    utterance.rate = speechSettings.rate;
    utterance.pitch = speechSettings.pitch;
    utterance.volume = Math.max(
      0,
      Math.min(voiceVolume * speechSettings.volumeScale, 0.9),
    );

    if (dom.guidedMeditationText) {
      dom.guidedMeditationText.textContent = line;
    }

    utterance.onend = () => {
      if (!isGuidedMeditationPlaying || !isAudioForActiveState(stateKey)) {
        return;
      }

      guidedMeditationLineIndex++;
      guidedMeditationTimeoutId = setTimeout(() => {
        speakGuidedMeditationLine(stateKey);
      }, calculateMeditationPauseDuration(line));
    };

    utterance.onerror = () => {
      stopGuidedMeditation("Guided voice stopped. You can continue silently.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function startGuidedMeditation(stateKey = getGuidedMeditationStateKey()) {
    const activeStateKey = getActiveAudioStateKey();

    if (!activeStateKey) {
      stopGuidedMeditation("Guided voice will follow the selected state.");
      updateSoundStatus();
      return;
    }

    stateKey = activeStateKey;

    if (!supportsGuidedMeditation()) {
      if (dom.guidedMeditationText) {
        dom.guidedMeditationText.textContent =
          "Guided voice is not available in this browser.";
      }
      return;
    }

    const preferences = getPreferences();

    if (!preferences.soundEnabled || !preferences.guidedMeditationEnabled) {
      preferences.soundEnabled = true;
      preferences.guidedMeditationEnabled = true;
      savePreferences();
      applyPreferences({ refreshParticles: false, updateAudio: true });
    }

    selectedMeditationVoice = selectMeditationVoice();
    window.speechSynthesis.cancel();
    guidedMeditationLineIndex = 0;
    isGuidedMeditationPlaying = true;
    updateGuidedMeditationControls();
    speakGuidedMeditationLine(stateKey);
  }

  function toggleGuidedMeditation() {
    if (isGuidedMeditationPlaying) {
      stopGuidedMeditation();
    } else {
      startGuidedMeditation();
    }
  }

  preloadVoiceSelection();

  return {
    isPlaying: () => isGuidedMeditationPlaying,
    supportsGuidedMeditation,
    startGuidedMeditation,
    stopGuidedMeditation,
    toggleGuidedMeditation,
    updateGuidedMeditationControls,
  };
}
