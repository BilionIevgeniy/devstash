export const REPEL_RADIUS = 120;
const REPEL_FORCE = 900;
export const MAX_SPEED = 220;
const SPEED_RECOVERY = 1.5;
const GRID_COLUMNS = 4;
const GRID_ROWS = 2;

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface BoxSize {
  width: number;
  height: number;
}

export interface ChaosBody extends Point, Velocity {
  size: number;
  cruise: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// A jittered grid, so the icons never start in a clump. Jitter is -0.2 to 0.2 of a cell.
export function seedPosition(
  index: number,
  box: BoxSize,
  size: number,
  jitter: Point,
): Point {
  const cellWidth = box.width / GRID_COLUMNS;
  const cellHeight = box.height / GRID_ROWS;
  const column = index % GRID_COLUMNS;
  const row = Math.floor(index / GRID_COLUMNS);
  const x = (column + 0.5) * cellWidth - size / 2 + jitter.x * cellWidth;
  const y = (row + 0.5) * cellHeight - size / 2 + jitter.y * cellHeight;

  return {
    x: clamp(x, 0, Math.max(box.width - size, 0)),
    y: clamp(y, 0, Math.max(box.height - size, 0)),
  };
}

export function repel(
  body: ChaosBody,
  pointer: Point | null,
  step: number,
): Velocity {
  const { vx, vy } = body;
  if (!pointer) return { vx, vy };

  const dx = body.x + body.size / 2 - pointer.x;
  const dy = body.y + body.size / 2 - pointer.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance >= REPEL_RADIUS) return { vx, vy };

  const push = REPEL_FORCE * (1 - distance / REPEL_RADIUS) ** 2 * step;
  return {
    vx: vx + (dx / distance) * push,
    vy: vy + (dy / distance) * push,
  };
}

// Caps the speed, then eases it back to the icon's cruise speed.
export function settleSpeed(body: ChaosBody, step: number): Velocity {
  const { vx, vy, cruise } = body;
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return { vx, vy };

  const capped = Math.min(speed, MAX_SPEED);
  const next = capped + (cruise - capped) * Math.min(1, SPEED_RECOVERY * step);
  return { vx: vx * (next / speed), vy: vy * (next / speed) };
}

export function bounce(body: ChaosBody, box: BoxSize): Point & Velocity {
  const maxX = Math.max(box.width - body.size, 0);
  const maxY = Math.max(box.height - body.size, 0);
  let { vx, vy } = body;

  if (body.x <= 0) vx = Math.abs(vx);
  if (body.x >= maxX) vx = -Math.abs(vx);
  if (body.y <= 0) vy = Math.abs(vy);
  if (body.y >= maxY) vy = -Math.abs(vy);

  return { x: clamp(body.x, 0, maxX), y: clamp(body.y, 0, maxY), vx, vy };
}
