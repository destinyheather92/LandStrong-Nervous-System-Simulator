import { formatStoredDate, isSameDay, normalizeStoredDate } from "./utils/dates.js";
import { escapeHtml } from "./utils/html.js";
import { readStorage, storageKeys, writeStorage } from "./storageUtils.js";

// This owns saved reflections, affirmations, routines, and progress history.
export function createWellnessManager({
  dom,
  appState,
  activityData,
  saveActivity,
  emotionalStates,
  affirmationsByState,
}) {
  const routineRefreshOffsets = {};

  function getReflections() {
    const reflections = readStorage(storageKeys.reflections, []);
    return Array.isArray(reflections) ? reflections : [];
  }

  function getStateKeyFromName(stateName) {
    const entry = Object.entries(emotionalStates).find(
      ([, state]) => state.name === stateName,
    );
    return entry ? entry[0] : "calm";
  }

  function trackEmotionSelection(emotionKey) {
    const state = emotionalStates[emotionKey];
    const now = new Date();

    activityData.emotionHistory.unshift({
      id: now.getTime(),
      stateKey: emotionKey,
      stateName: state.name,
      color: state.color,
      createdAt: now.toISOString(),
    });

    saveActivity();
  }

  function trackBreathingSession(emotionKey) {
    const state = emotionalStates[emotionKey];
    const now = new Date();

    activityData.breathingSessions.unshift({
      id: now.getTime(),
      stateKey: emotionKey,
      stateName: state.name,
      pattern: state.breathingPattern,
      cycles: state.breathingCycles,
      createdAt: now.toISOString(),
    });

    saveActivity();
    renderDashboard();
    renderTimeline();
    renderPersonalRoutine();
  }

  function trackAppVisit() {
    const now = new Date();

    activityData.appVisits.unshift({
      id: now.getTime(),
      createdAt: now.toISOString(),
    });

    saveActivity();
  }

  function countByState(records) {
    return records.reduce((totals, record) => {
      const key = record.stateKey || getStateKeyFromName(record.stateName);
      totals[key] = (totals[key] || 0) + 1;
      return totals;
    }, {});
  }

  function getDominantStateKey() {
    const stateCounts = countByState(activityData.emotionHistory);
    const rankedStates = Object.entries(stateCounts).sort((a, b) => b[1] - a[1]);
    return rankedStates.length
      ? rankedStates[0][0]
      : appState.selectedEmotion || "calm";
  }

  function getRoutineStateKey() {
    if (appState.selectedEmotion) return appState.selectedEmotion;

    const recentStates = activityData.emotionHistory.slice(0, 6);
    if (!recentStates.length) return "calm";

    const recentCounts = countByState(recentStates);
    return Object.entries(recentCounts).sort((a, b) => b[1] - a[1])[0][0];
  }

  function renderAffirmation(affirmation) {
    if (!dom.affirmationText || !dom.affirmationMeta || !affirmation) return;

    dom.affirmationText.textContent = affirmation.text;
    dom.affirmationMeta.textContent = `${affirmation.stateName} affirmation shown ${formatStoredDate(
      affirmation.createdAt,
    )}.`;
  }

  function showAffirmation(emotionKey = getRoutineStateKey(), forceNew = false) {
    const today = new Date();
    const lastAffirmation = readStorage(storageKeys.lastAffirmation, null);

    if (
      !forceNew &&
      lastAffirmation &&
      lastAffirmation.stateKey === emotionKey &&
      isSameDay(new Date(lastAffirmation.createdAt), today)
    ) {
      renderAffirmation(lastAffirmation);
      return;
    }

    const affirmations =
      affirmationsByState[emotionKey] || affirmationsByState.calm;
    const previousText = lastAffirmation ? lastAffirmation.text : "";
    const candidates = affirmations.filter((text) => text !== previousText);
    const selectedText =
      candidates[Math.floor(Math.random() * candidates.length)] ||
      affirmations[0];

    const affirmation = {
      text: selectedText,
      stateKey: emotionKey,
      stateName: emotionalStates[emotionKey].name,
      createdAt: today.toISOString(),
    };

    writeStorage(storageKeys.lastAffirmation, affirmation);
    renderAffirmation(affirmation);
  }

  function renderDashboard() {
    if (!dom.stateCountStat) return;

    const reflections = getReflections();
    const dominantStateKey = getDominantStateKey();
    const dominantState = emotionalStates[dominantStateKey];
    const dominantCount =
      countByState(activityData.emotionHistory)[dominantStateKey] || 0;
    const latestVisit = activityData.appVisits[0];

    dom.stateCountStat.textContent = activityData.emotionHistory.length;
    dom.breathingCountStat.textContent = activityData.breathingSessions.length;
    dom.journalCountStat.textContent = reflections.length;
    dom.visitCountStat.textContent = activityData.appVisits.length;

    dom.dominantStateStat.textContent = activityData.emotionHistory.length
      ? `${dominantState.name} has appeared most often in your check-ins (${dominantCount} total). Latest visit: ${formatStoredDate(
          latestVisit ? latestVisit.createdAt : null,
        )}.`
      : `Your pattern will build as you choose states and complete sessions. Latest visit: ${formatStoredDate(
          latestVisit ? latestVisit.createdAt : null,
        )}.`;
  }

  function renderTimeline() {
    if (!dom.emotionTimeline) return;

    const reflectionEvents = getReflections().map((reflection) => {
      const stateKey =
        reflection.emotionKey || getStateKeyFromName(reflection.emotion);

      return {
        type: "reflection",
        stateKey,
        stateName: reflection.emotion || emotionalStates[stateKey].name,
        text: reflection.text,
        createdAt: reflection.createdAt || normalizeStoredDate(reflection.id),
      };
    });

    const stateEvents = activityData.emotionHistory.map((event) => ({
      ...event,
      type: "state",
      text: "State selected",
    }));

    const timelineEvents = [...stateEvents, ...reflectionEvents]
      .filter((event) => event.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 16);

    if (!timelineEvents.length) {
      dom.emotionTimeline.innerHTML =
        '<p class="module-note">Your timeline will appear after your first check-in.</p>';
      return;
    }

    dom.emotionTimeline.innerHTML = timelineEvents
      .map((event) => {
        const state = emotionalStates[event.stateKey] || emotionalStates.calm;
        const label =
          event.type === "reflection"
            ? `${event.stateName} reflection`
            : `${event.stateName} check-in`;

        return `
          <div class="timeline-item" style="--timeline-color: ${state.color}">
            <div class="timeline-label">${escapeHtml(label)}</div>
            <div class="timeline-date">${formatStoredDate(event.createdAt)}</div>
            <div class="timeline-text">${escapeHtml(event.text || "")}</div>
          </div>
        `;
      })
      .join("");
  }

  function formatRoutineBreath(state) {
    const pattern = state.breathingPattern;
    const holdText = pattern.hold > 0 ? pattern.hold : 0;
    return `${pattern.inhale}-${holdText}-${pattern.exhale}`;
  }

  function getRoutineRefreshOffset(stateKey) {
    return routineRefreshOffsets[stateKey] || 0;
  }

  function renderPersonalRoutine() {
    if (!dom.routineContent) return;

    const stateKey = getRoutineStateKey();
    const state = emotionalStates[stateKey];
    const refreshOffset = getRoutineRefreshOffset(stateKey);
    const sessionCount = activityData.breathingSessions.filter(
      (session) => session.stateKey === stateKey,
    ).length;
    const reflectionCount = getReflections().filter(
      (reflection) =>
        (reflection.emotionKey || getStateKeyFromName(reflection.emotion)) ===
        stateKey,
    ).length;
    const routineSeed = sessionCount + reflectionCount + refreshOffset;
    const promptIndex = routineSeed % state.prompts.length;
    const firstTechniqueIndex = routineSeed % state.groundingTechniques.length;
    const firstTechnique =
      state.groundingTechniques[firstTechniqueIndex];
    const secondTechnique =
      state.groundingTechniques[
        (firstTechniqueIndex + 1) % state.groundingTechniques.length
      ];

    dom.routineContent.innerHTML = `
      <div class="routine-chip-row">
        <span class="routine-chip">${state.name}</span>
        <span class="routine-chip">${formatRoutineBreath(state)} breath</span>
        <span class="routine-chip">${state.breathingCycles} cycles</span>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Breath</div>
        <div>${escapeHtml(state.breathingStyle)}. Follow ${formatRoutineBreath(
          state,
        )} for ${state.breathingCycles} cycles.</div>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Prompt</div>
        <div>${escapeHtml(state.prompts[promptIndex])}</div>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Grounding</div>
        <div>${escapeHtml(firstTechnique.title)}: ${escapeHtml(
          firstTechnique.text,
        )}</div>
        <div>${escapeHtml(secondTechnique.title)}: ${escapeHtml(
          secondTechnique.text,
        )}</div>
      </div>
      <div class="routine-step">
        <div class="routine-step-title">Pattern</div>
        <div>${sessionCount} completed breathing sessions and ${reflectionCount} reflections for this state are shaping this recommendation.</div>
      </div>
    `;
  }

  function refreshPersonalRoutine() {
    const stateKey = getRoutineStateKey();

    // The routine is history-based, so refresh needs a small nudge to show a new option.
    routineRefreshOffsets[stateKey] = getRoutineRefreshOffset(stateKey) + 1;
    renderPersonalRoutine();

    if (!dom.refreshRoutineButton) return;

    dom.refreshRoutineButton.textContent = "Routine Refreshed";
    setTimeout(() => {
      dom.refreshRoutineButton.textContent = "Refresh Routine";
    }, 1200);
  }

  function saveReflection() {
    const text = dom.journalInput.value.trim();
    if (!text) {
      alert("Please write something before saving.");
      return;
    }

    const now = new Date();
    const reflection = {
      id: now.getTime(),
      text,
      emotionKey: appState.selectedEmotion,
      emotion: emotionalStates[appState.selectedEmotion].name,
      timestamp: now.toLocaleString(),
      createdAt: now.toISOString(),
      date: now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    const reflections = [reflection, ...getReflections()].slice(0, 20);
    writeStorage(storageKeys.reflections, reflections);

    dom.journalInput.value = "";
    dom.charCount.textContent = "0";

    loadReflections();
    renderDashboard();
    renderTimeline();
    renderPersonalRoutine();

    dom.saveReflectionButton.textContent = "Saved ✓";
    setTimeout(() => {
      dom.saveReflectionButton.textContent = "Save Reflection";
    }, 2000);
  }

  function loadReflections() {
    const reflections = getReflections();
    dom.reflectionsList.innerHTML = "";

    if (reflections.length === 0) {
      dom.reflectionsList.innerHTML =
        '<p style="color: rgba(255,255,255,0.5); font-style: italic;">No reflections yet. Start your journey today.</p>';
      return;
    }

    reflections.forEach((reflection) => {
      const card = document.createElement("div");
      card.className = "reflection-card";
      card.innerHTML = `
        <div class="reflection-date">${reflection.date} • ${reflection.emotion}</div>
        <div class="reflection-content">${escapeHtml(reflection.text)}</div>
      `;
      dom.reflectionsList.appendChild(card);
    });
  }

  function bindJournalControls() {
    dom.journalInput.addEventListener("input", (event) => {
      dom.charCount.textContent = event.target.value.length;
    });

    dom.saveReflectionButton.addEventListener("click", saveReflection);
  }

  function renderInitialWellness() {
    renderDashboard();
    renderTimeline();
    renderPersonalRoutine();

    const lastAffirmation = readStorage(storageKeys.lastAffirmation, null);
    if (lastAffirmation) {
      renderAffirmation(lastAffirmation);
    } else {
      showAffirmation("calm");
    }
  }

  return {
    bindJournalControls,
    getRoutineStateKey,
    loadReflections,
    renderDashboard,
    renderInitialWellness,
    renderPersonalRoutine,
    refreshPersonalRoutine,
    renderTimeline,
    showAffirmation,
    trackAppVisit,
    trackBreathingSession,
    trackEmotionSelection,
  };
}
