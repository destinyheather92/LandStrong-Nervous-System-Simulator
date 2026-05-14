// This keeps saved journal text from becoming executable HTML when it is shown again.
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
