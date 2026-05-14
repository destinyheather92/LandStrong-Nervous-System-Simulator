// This identifies elements whose text should respond to the font-size control.
function elementHasReadableText(element) {
  const textInputTypes = ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "OPTION"];

  if (textInputTypes.includes(element.tagName)) {
    return true;
  }

  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
  );
}

export function createFontScaleManager({ dom, getPreferences }) {
  let fontScaleObserver = null;
  let fontScaleFrameId = null;

  function applyFontScaleToPage() {
    const scale = getPreferences().fontScale / 100;
    const elements = Array.from(dom.getAllBodyElements()).filter(elementHasReadableText);
    const measurements = elements.map((element) => {
      const baseSize =
        element.dataset.baseFontSize ||
        window.getComputedStyle(element).fontSize.replace("px", "");

      return {
        element,
        baseSize: Number(baseSize),
      };
    });

    measurements.forEach(({ element, baseSize }) => {
      if (!Number.isFinite(baseSize)) return;

      element.dataset.baseFontSize = String(baseSize);
      element.style.fontSize = `${(baseSize * scale).toFixed(2)}px`;
    });
  }

  // This batches font updates so repeated DOM changes do not cause extra layout work.
  function scheduleFontScaleRefresh() {
    if (fontScaleFrameId) {
      cancelAnimationFrame(fontScaleFrameId);
    }

    fontScaleFrameId = requestAnimationFrame(() => {
      fontScaleFrameId = null;
      applyFontScaleToPage();
    });
  }

  function setupFontScaleObserver() {
    if (fontScaleObserver) return;

    fontScaleObserver = new MutationObserver(scheduleFontScaleRefresh);
    fontScaleObserver.observe(dom.body, {
      childList: true,
      subtree: true,
    });
  }

  return {
    scheduleFontScaleRefresh,
    setupFontScaleObserver,
  };
}

// This adds lightweight accessibility metadata for screen readers and keyboard users.
export function setupAccessibility(dom) {
  dom.getButtons().forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
  });

  dom.heroSection.setAttribute("aria-label", "Hero introduction section");
  dom.stateSection.setAttribute("aria-label", "Emotion selection section");
  dom.regulationSection.setAttribute(
    "aria-label",
    "Regulation and healing section",
  );
  dom.journalInput.setAttribute("aria-label", "Reflection journal text input");

  if (dom.affirmationText) dom.affirmationText.setAttribute("aria-live", "polite");
  if (dom.routineContent) dom.routineContent.setAttribute("aria-live", "polite");
  if (dom.emotionTimeline) dom.emotionTimeline.setAttribute("aria-live", "polite");
}

// This preserves the glowing cursor movement from the original app.
export function setupCustomCursor(dom) {
  document.addEventListener("mousemove", (event) => {
    if (dom.customCursor) {
      dom.customCursor.style.left = `${event.clientX - 10}px`;
      dom.customCursor.style.top = `${event.clientY - 10}px`;
    }

    if (dom.cursorFollower) {
      setTimeout(() => {
        dom.cursorFollower.style.left = `${event.clientX - 25}px`;
        dom.cursorFollower.style.top = `${event.clientY - 25}px`;
      }, 50);
    }
  });
}

// This keeps the Escape reset and Enter activation behavior intact.
export function setupKeyboardNavigation({ dom, appState }) {
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && appState.currentSection !== "hero") {
      dom.resetButton.click();
    }

    if (
      event.key === "Enter" &&
      document.activeElement.classList.contains("btn")
    ) {
      document.activeElement.click();
    }
  });
}
