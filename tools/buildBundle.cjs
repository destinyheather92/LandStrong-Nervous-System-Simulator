const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

// These files are ordered so shared helpers appear before the modules that use them.
const files = [
  "src/appState.js",
  "src/domElements.js",
  "src/storageUtils.js",
  "src/utils/html.js",
  "src/utils/dates.js",
  "src/data/emotionalStates.js",
  "src/ui/particles.js",
  "src/ui/transitions.js",
  "src/ui/emotionGrid.js",
  "src/ui/regulationContent.js",
  "src/ui/accessibility.js",
  "src/breathing/breathingAnimations.js",
  "src/breathing/breathingEngine.js",
  "src/audio/audioUtils.js",
  "src/audio/guidedMeditation.js",
  "src/audio/meditationAudio.js",
  "src/audio/audioManager.js",
  "src/wellnessManager.js",
  "src/main.js",
  "src/entry.js",
];

function stripModuleSyntax(source) {
  return source
    .replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];\s*\n?/gm, "")
    .replace(/^export\s+(?=(const|let|var|function|class)\s)/gm, "");
}

const chunks = files.map((file) => {
  const absolutePath = path.join(root, file);
  const source = fs.readFileSync(absolutePath, "utf8");

  return `
// ============================================================
// ${file}
// ============================================================
${stripModuleSyntax(source)}`;
});

const bundle = `/* ============================================================
   LandStrong: Nervous System Simulator - Browser Bundle

   This file is generated from the modular files in src/.
   It uses a normal script tag so index.html can be opened directly
   without a local static server.
   ============================================================ */

(() => {
  "use strict";
${chunks.join("\n")}
})();
`;

fs.writeFileSync(path.join(root, "script.js"), bundle, "utf8");
console.log("Built script.js from src modules.");
