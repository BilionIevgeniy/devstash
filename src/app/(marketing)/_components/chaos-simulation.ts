import "client-only";

import {
  bounce,
  type ChaosBody,
  type Point,
  repel,
  seedPosition,
  settleSpeed,
} from "./chaos-physics";

const MAX_STEP = 0.032;
const MAX_ROTATION = 10;
const MAX_SCALE_CHANGE = 0.06;
const TWO_PI = Math.PI * 2;

interface ChaosIcon extends ChaosBody {
  element: HTMLElement;
  rotationPeriod: number;
  rotationPhase: number;
  scalePeriod: number;
  scalePhase: number;
}

interface ChaosState {
  box: HTMLElement;
  reducedMotion: MediaQueryList;
  icons: ChaosIcon[];
  width: number;
  height: number;
  pointer: Point | null;
  inView: boolean;
  frameId: number;
  lastFrame: number;
  clock: number;
}

function between(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function createIcon(
  element: HTMLElement,
  index: number,
  state: ChaosState,
): ChaosIcon {
  const size = element.offsetWidth;
  const direction = between(0, TWO_PI);
  const cruise = between(18, 36);
  const jitter = { x: between(-0.2, 0.2), y: between(-0.2, 0.2) };

  return {
    element,
    size,
    cruise,
    ...seedPosition(index, state, size, jitter),
    vx: Math.cos(direction) * cruise,
    vy: Math.sin(direction) * cruise,
    rotationPeriod: between(6, 10),
    rotationPhase: between(0, TWO_PI),
    scalePeriod: between(4, 7),
    scalePhase: between(0, TWO_PI),
  };
}

function drawIcon(state: ChaosState, icon: ChaosIcon): void {
  const { clock, reducedMotion } = state;
  const rotation =
    MAX_ROTATION *
    Math.sin((TWO_PI * clock) / icon.rotationPeriod + icon.rotationPhase);
  const scale = reducedMotion.matches
    ? 1
    : 1 +
      MAX_SCALE_CHANGE *
        Math.sin((TWO_PI * clock) / icon.scalePeriod + icon.scalePhase);

  icon.element.style.transform = `translate(${icon.x}px, ${icon.y}px) rotate(${rotation}deg) scale(${scale})`;
}

function stepIcon(state: ChaosState, icon: ChaosIcon, step: number): void {
  Object.assign(icon, repel(icon, state.pointer, step));
  Object.assign(icon, settleSpeed(icon, step));
  icon.x += icon.vx * step;
  icon.y += icon.vy * step;
  Object.assign(icon, bounce(icon, state));
  drawIcon(state, icon);
}

function runFrame(state: ChaosState, now: number): void {
  const elapsed = state.lastFrame ? (now - state.lastFrame) / 1000 : 0;
  const step = Math.min(elapsed, MAX_STEP);
  state.lastFrame = now;
  state.clock += step;

  for (const icon of state.icons) stepIcon(state, icon, step);
  state.frameId = requestAnimationFrame((time) => runFrame(state, time));
}

// The loop runs only while someone can see it and motion is allowed.
function syncLoop(state: ChaosState): void {
  const { reducedMotion } = state;
  const shouldRun = state.inView && !document.hidden && !reducedMotion.matches;

  if (shouldRun && !state.frameId) {
    state.lastFrame = 0;
    state.frameId = requestAnimationFrame((time) => runFrame(state, time));
  } else if (!shouldRun && state.frameId) {
    cancelAnimationFrame(state.frameId);
    state.frameId = 0;
  }
  if (reducedMotion.matches) {
    for (const icon of state.icons) drawIcon(state, icon);
  }
}

function measure(state: ChaosState): void {
  state.width = state.box.clientWidth;
  state.height = state.box.clientHeight;
  for (const icon of state.icons) {
    icon.size = icon.element.offsetWidth;
    Object.assign(icon, bounce(icon, state));
    drawIcon(state, icon);
  }
}

function createState(box: HTMLElement): ChaosState {
  const state: ChaosState = {
    box,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)"),
    icons: [],
    width: box.clientWidth,
    height: box.clientHeight,
    pointer: null,
    inView: true,
    frameId: 0,
    lastFrame: 0,
    clock: 0,
  };
  const elements = box.querySelectorAll<HTMLElement>("[data-chaos-icon]");
  state.icons = [...elements].map((element, index) =>
    createIcon(element, index, state),
  );
  return state;
}

// Starts the animation in the box and returns what stops it.
export function startChaos(box: HTMLElement): () => void {
  const state = createState(box);
  const sync = () => syncLoop(state);

  // Mouse only: a finger on the box is scrolling the page.
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const rect = box.getBoundingClientRect();
    state.pointer = {
      x: event.clientX - rect.left - box.clientLeft,
      y: event.clientY - rect.top - box.clientTop,
    };
  };
  const onPointerLeave = () => {
    state.pointer = null;
  };

  const resizeObserver = new ResizeObserver(() => measure(state));
  const viewObserver = new IntersectionObserver((entries) => {
    state.inView = entries[entries.length - 1].isIntersecting;
    sync();
  });

  box.addEventListener("pointermove", onPointerMove);
  box.addEventListener("pointerleave", onPointerLeave);
  document.addEventListener("visibilitychange", sync);
  state.reducedMotion.addEventListener("change", sync);
  resizeObserver.observe(box);
  viewObserver.observe(box);

  for (const icon of state.icons) drawIcon(state, icon);
  box.dataset.ready = "";
  sync();

  return () => {
    cancelAnimationFrame(state.frameId);
    resizeObserver.disconnect();
    viewObserver.disconnect();
    box.removeEventListener("pointermove", onPointerMove);
    box.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("visibilitychange", sync);
    state.reducedMotion.removeEventListener("change", sync);
  };
}
