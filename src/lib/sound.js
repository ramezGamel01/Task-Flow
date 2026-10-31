// Small sounds made on the fly with the Web Audio API, so there are no audio files to load.
let ctx = null;

function audio() {
  if (!ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(ac, { freq, start, length, gain, type = "sine" }) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
  osc.connect(amp).connect(ac.destination);
  osc.start(start);
  osc.stop(start + length + 0.02);
}

// Two rising notes when a task is finished
export function playComplete() {
  try {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    tone(ac, { freq: 659.25, start: t, length: 0.16, gain: 0.07 });
    tone(ac, { freq: 987.77, start: t + 0.07, length: 0.28, gain: 0.06 });
  } catch {
    // Sound is a nicety; never let it break anything
  }
}

// A soft three-note chime when a focus session ends
export function playChime() {
  try {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, i) => tone(ac, { freq, start: t + i * 0.14, length: 0.9, gain: 0.05, type: "triangle" }));
  } catch {
    // ignore
  }
}
