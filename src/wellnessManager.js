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
//loads data from local storage and provides functions to track user activity, generate personalized routines, and render the wellness dashboard and timeline. It also manages affirmations based on the user's emotional state and recent activity. The wellness manager is designed to be modular and interacts with the app state, DOM elements, and storage utilities to create a cohesive user experience focused on emotional regulation and self-reflection.
  function getReflections() {
    const reflections = readStorage(storageKeys.reflections, []);
    return Array.isArray(reflections) ? reflections : [];
  }
// This function finds the state key corresponding to a given state name by searching through the emotionalStates object. If it finds a match, it returns the key; otherwise, it defaults to "calm". This is useful for cases where we have a state name (e.g., from a reflection) but need to link it back to the corresponding state key for consistency in tracking and rendering.
  function getStateKeyFromName(stateName) {
    const entry = Object.entries(emotionalStates).find(
      ([, state]) => state.name === stateName,
    );
    return entry ? entry[0] : "calm";
  }

  //keeping up with the user's emotional state and activity history, providing personalized recommendations, and creating an engaging and supportive experience that encourages regular check-ins, self-reflection, and emotional regulation practices. By tracking key interactions and rendering dynamic content based on the user's data, the wellness manager helps users build awareness of their emotional patterns and offers tailored guidance to support their well-being journey.
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

  //this is called when a user completes a breathing session. It records the session in the activity data with details about the emotional state it was associated with, the breathing pattern used, and the timestamp. After saving the activity, it triggers a re-render of the dashboard, timeline, and personal routine to reflect the new session and update any recommendations or insights based on the user's evolving history.
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


  //tracking the visits to the app and adding it to the activity data. Each visit is recorded with a unique ID based on the current timestamp and the creation date. After saving the visit, it can be used to analyze user engagement over time, show patterns in app usage, and provide insights into how frequently the user is checking in with their emotional state and using the app's features. This information can also be displayed on the dashboard to encourage regular use and highlight progress.
  function trackAppVisit() {
    const now = new Date();

    activityData.appVisits.unshift({
      id: now.getTime(),
      createdAt: now.toISOString(),
    });

    saveActivity();
  }
// this function takes an array of records (such as emotion history or breathing sessions) and counts how many times each emotional state appears in those records. It uses the stateKey to categorize the counts, and if a record has a stateName instead, it converts it to a stateKey using the getStateKeyFromName function. The result is an object where the keys are stateKeys and the values are the counts of how many times that state appears in the provided records. This is useful for analyzing patterns in the user's emotional history and generating insights for the dashboard and personalized routines.
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
// this is rendering the affirmation on the dashboard based on the provided affirmation object. It checks if the necessary DOM elements for displaying the affirmation are present and if the affirmation data is valid. If everything is in place, it updates the text content of the affirmation and its metadata (such as when it was shown and for which emotional state) to provide a personalized and timely message to the user. This helps reinforce positive messages and encourages users to engage with their emotional well-being regularly.
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
// this cycles through the affirmations for the given emotional state and selects one that is different from the last shown affirmation (if available). It ensures that the user receives a fresh message while still providing relevant content based on their current emotional state. The selected affirmation is then saved to storage and rendered on the dashboard, creating a dynamic and personalized experience that encourages users to engage with their emotional well-being regularly.
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
//render dashboard function updates the various statistics and insights displayed on the wellness dashboard based on the user's activity data. It calculates counts of emotional states, breathing sessions, journal reflections, and app visits, and identifies the dominant emotional state from the user's check-ins. The dashboard is then updated with this information to provide the user with a clear overview of their emotional patterns and engagement with the app, encouraging continued use and self-reflection.
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
