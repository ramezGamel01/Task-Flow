// Keeps 3D scenes from breaking the page: shows a fallback when WebGL fails,
// and reports whether a scene is on screen so it can stop rendering when it isn't.
import { Component, useEffect, useState } from "react";

export function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("3D scene unavailable:", error?.message);
  }
  render() {
    return this.state.failed || !hasWebGL() ? this.props.fallback ?? null : this.props.children;
  }
}

export function useOnScreen(ref, margin = "100px") {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") return setVisible(true);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return visible;
}
