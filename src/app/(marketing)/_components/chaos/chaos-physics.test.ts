import { describe, expect, it } from "vitest";

import {
  bounce,
  type ChaosBody,
  MAX_SPEED,
  repel,
  REPEL_RADIUS,
  seedPosition,
  settleSpeed,
} from "./chaos-physics";

const BODY: ChaosBody = { x: 100, y: 100, vx: 10, vy: 0, size: 40, cruise: 20 };
const CENTER = { x: 120, y: 120 };

describe("seedPosition", () => {
  const box = { width: 400, height: 200 };

  it("puts each index in its own grid cell", () => {
    const first = seedPosition(0, box, 40, { x: 0, y: 0 });
    const sixth = seedPosition(5, box, 40, { x: 0, y: 0 });

    expect(first).toEqual({ x: 30, y: 30 });
    expect(sixth).toEqual({ x: 130, y: 130 });
  });

  it("keeps a jittered icon inside the box", () => {
    const last = seedPosition(7, box, 40, { x: 5, y: 5 });

    expect(last).toEqual({ x: 360, y: 160 });
  });

  it("stays at the origin in a box smaller than the icon", () => {
    const position = seedPosition(3, { width: 10, height: 10 }, 40, {
      x: 0,
      y: 0,
    });

    expect(position).toEqual({ x: 0, y: 0 });
  });
});

describe("repel", () => {
  it("does nothing without a pointer", () => {
    expect(repel(BODY, null, 0.016)).toEqual({ vx: 10, vy: 0 });
  });

  it("does not divide by zero when the pointer is on the icon's center", () => {
    expect(repel(BODY, CENTER, 0.016)).toEqual({ vx: 10, vy: 0 });
  });

  it("ignores a pointer exactly at the radius", () => {
    const pointer = { x: CENTER.x - REPEL_RADIUS, y: CENTER.y };

    expect(repel(BODY, pointer, 0.016)).toEqual({ vx: 10, vy: 0 });
  });

  it("pushes the icon away from a near pointer", () => {
    const pointer = { x: CENTER.x - 30, y: CENTER.y };

    expect(repel(BODY, pointer, 0.016).vx).toBeGreaterThan(10);
  });
});

describe("settleSpeed", () => {
  it("leaves a stopped icon stopped", () => {
    expect(settleSpeed({ ...BODY, vx: 0, vy: 0 }, 0.016)).toEqual({
      vx: 0,
      vy: 0,
    });
  });

  it("caps a fast icon at the maximum speed", () => {
    const { vx } = settleSpeed({ ...BODY, vx: 1000 }, 0);

    expect(vx).toBe(MAX_SPEED);
  });

  it("eases toward the cruise speed", () => {
    const { vx } = settleSpeed({ ...BODY, vx: 100 }, 0.1);

    expect(vx).toBeLessThan(100);
    expect(vx).toBeGreaterThan(BODY.cruise);
  });
});

describe("bounce", () => {
  const box = { width: 200, height: 200 };

  it("turns an icon back at the left wall", () => {
    const result = bounce({ ...BODY, x: -5, vx: -10 }, box);

    expect(result.x).toBe(0);
    expect(result.vx).toBe(10);
  });

  it("turns an icon back at the bottom wall", () => {
    const result = bounce({ ...BODY, y: 170, vy: 10 }, box);

    expect(result.y).toBe(160);
    expect(result.vy).toBe(-10);
  });

  it("pins the icon to the origin in a box smaller than the icon", () => {
    const result = bounce(BODY, { width: 10, height: 10 });

    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
  });
});
