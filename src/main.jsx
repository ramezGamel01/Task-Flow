import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/readex-pro";
import "./styles/base.css";
import App from "./App.jsx";

// After a new deploy, a tab that was already open can ask for code files that no longer
// exist. Reload once to pick up the new version instead of showing a broken page.
window.addEventListener("vite:preloadError", (event) => {
  try {
    const last = Number(sessionStorage.getItem("taskflow:reloadedAt") ?? 0);
    if (Date.now() - last < 10000) return;
    sessionStorage.setItem("taskflow:reloadedAt", String(Date.now()));
  } catch {
    // Without storage there is no way to tell a loop from a one-off, so leave the page as is
    return;
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
