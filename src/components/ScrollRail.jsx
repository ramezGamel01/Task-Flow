// A scrollbar drawn as a checklist: tick marks run down the track, the part already read
// fills in, and the thumb is a check that shows how far along the page you are.
// Drag the thumb or click the track to jump. Mouse and trackpad only; touch keeps the
// native scrollbar.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { Check } from "lucide-react";
import { useI18n } from "../i18n/I18n.jsx";

export default function ScrollRail() {
  const { f } = useI18n();
  const location = useLocation();
  const [enabled, setEnabled] = useState(false);
  const rail = useRef(null);
  const thumb = useRef(null);
  const label = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    const query = matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("has-rail");
    let frame = 0;
    let idle = 0;

    const draw = () => {
      frame = 0;
      const r = rail.current;
      const t = thumb.current;
      if (!r || !t) return;
      const doc = root.scrollHeight;
      const vh = window.innerHeight;
      const max = doc - vh;
      r.classList.toggle("is-hidden", max < 40);
      const height = r.clientHeight;
      const size = Math.max(44, height * (vh / doc));
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      t.style.height = `${size}px`;
      t.style.transform = `translateY(${((height - size) * p).toFixed(1)}px)`;
      r.style.setProperty("--fill", `${((height - size) * p + size / 2).toFixed(1)}px`);
      r.classList.toggle("is-end", p > 0.995);
      label.current.textContent = f.percent(p);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const onScroll = () => {
      schedule();
      rail.current?.classList.add("is-active");
      clearTimeout(idle);
      idle = setTimeout(() => rail.current?.classList.remove("is-active"), 1000);
    };

    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(idle);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      root.classList.remove("has-rail");
    };
  }, [enabled, f, location.pathname]);

  function scrollToRatio(ratio, smooth) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const reduce = document.documentElement.classList.contains("no-motion");
    window.scrollTo({ top: Math.min(1, Math.max(0, ratio)) * max, behavior: smooth && !reduce ? "smooth" : "auto" });
  }

  function onPointerDown(event) {
    const box = rail.current.getBoundingClientRect();
    const t = thumb.current.getBoundingClientRect();
    event.preventDefault();
    rail.current.setPointerCapture(event.pointerId);
    rail.current.classList.add("is-dragging");
    const onThumb = event.clientY >= t.top && event.clientY <= t.bottom;
    drag.current = { offset: onThumb ? event.clientY - t.top : t.height / 2, size: t.height, box };
    if (!onThumb) scrollToRatio((event.clientY - box.top - t.height / 2) / (box.height - t.height), true);
  }

  function onPointerMove(event) {
    if (!drag.current) return;
    const { offset, size, box } = drag.current;
    scrollToRatio((event.clientY - box.top - offset) / (box.height - size), false);
  }

  function onPointerUp() {
    drag.current = null;
    rail.current?.classList.remove("is-dragging");
  }

  if (!enabled) return null;
  return (
    <div className="rail" ref={rail} aria-hidden="true" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <span className="rail-track" />
      <span className="rail-fill" />
      <span className="rail-thumb" ref={thumb}>
        <Check size={12} strokeWidth={3} />
        <span className="rail-label" ref={label} />
      </span>
    </div>
  );
}
