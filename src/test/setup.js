import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom lacks these browser APIs
window.matchMedia ??= (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
});

window.IntersectionObserver ??= class {
  observe() {}
  disconnect() {}
};

window.scrollTo = () => {};

// No WebGL in jsdom: 3D scenes fall back to their flat drawings
HTMLCanvasElement.prototype.getContext = () => null;
