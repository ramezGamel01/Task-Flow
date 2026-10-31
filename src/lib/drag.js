// Pointer dragging shared by the board and the calendar. A copy of the dragged element
// follows the pointer and leans into the direction it moves; the caller decides what lies
// underneath (elementFromPoint ignores the copy) and what a drop means.

const EDGE = 72;

export function startDrag(event, { source, onMove, onDrop, onCancel }) {
  if (event.button !== 0) return;
  const startX = event.clientX;
  const startY = event.clientY;
  let rect = source.getBoundingClientRect();
  let ghost = null;
  let started = false;
  let lastX = startX;
  let lean = 0;
  let pointer = { x: startX, y: startY };
  let scrollFrame = 0;
  const offsetX = startX - rect.left;
  const offsetY = startY - rect.top;

  const place = () => {
    if (!ghost) return;
    ghost.style.transform = `perspective(700px) translate3d(${pointer.x - offsetX}px, ${pointer.y - offsetY}px, 0) rotate(${(lean * 0.35).toFixed(2)}deg) rotateY(${lean.toFixed(2)}deg) scale(1.04)`;
  };

  // Scroll the page when the pointer nears the top or bottom edge
  const autoScroll = () => {
    const vh = window.innerHeight;
    let dy = 0;
    if (pointer.y < EDGE) dy = -Math.ceil((EDGE - pointer.y) / 6);
    else if (pointer.y > vh - EDGE) dy = Math.ceil((pointer.y - (vh - EDGE)) / 6);
    if (dy) {
      window.scrollBy(0, dy);
      onMove?.(pointer);
    }
    scrollFrame = requestAnimationFrame(autoScroll);
  };

  const begin = () => {
    started = true;
    rect = source.getBoundingClientRect();
    ghost = source.cloneNode(true);
    ghost.classList.add("drag-ghost");
    ghost.removeAttribute("id");
    ghost.setAttribute("aria-hidden", "true");
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    document.body.append(ghost);
    document.documentElement.classList.add("is-dragging");
    scrollFrame = requestAnimationFrame(autoScroll);
  };

  const move = (e) => {
    pointer = { x: e.clientX, y: e.clientY };
    if (!started) {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < 6) return;
      begin();
      onMove?.(pointer, true);
    }
    e.preventDefault();
    lean = Math.max(-14, Math.min(14, lean * 0.75 + (e.clientX - lastX) * 0.9));
    lastX = e.clientX;
    place();
    onMove?.(pointer);
  };

  // Let the lean settle back while the pointer rests
  const settle = setInterval(() => {
    if (!started || Math.abs(lean) < 0.1) return;
    lean *= 0.8;
    place();
  }, 32);

  const cleanup = () => {
    clearInterval(settle);
    cancelAnimationFrame(scrollFrame);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel);
    window.removeEventListener("keydown", key, true);
    ghost?.remove();
    document.documentElement.classList.remove("is-dragging");
  };

  const swallowClick = () => {
    // The click that follows a drag must not open the card
    const stop = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };
    window.addEventListener("click", stop, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", stop, { capture: true }), 0);
  };

  function up(e) {
    cleanup();
    if (!started) return;
    swallowClick();
    onDrop?.({ x: e.clientX, y: e.clientY });
  }

  function cancel() {
    cleanup();
    if (started) onCancel?.();
  }

  function key(e) {
    if (e.key === "Escape" && started) {
      e.preventDefault();
      cancel();
    }
  }

  window.addEventListener("pointermove", move, { passive: false });
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel);
  window.addEventListener("keydown", key, true);
}

export function elementAt(point, selector) {
  return document.elementFromPoint(point.x, point.y)?.closest(selector) ?? null;
}
