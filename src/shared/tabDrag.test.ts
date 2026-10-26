import { describe, expect, it } from "vitest";
import { dropIndex } from "./tabDrag";

// Centres of the other tabs (the dragged one left out), left to right.
const centres = [50, 150, 250];

describe("dropIndex", () => {
  it("drops first when left of every other tab", () => {
    expect(dropIndex(centres, 10)).toBe(0);
  });

  it("drops between the tabs the pointer is between", () => {
    expect(dropIndex(centres, 100)).toBe(1);
    expect(dropIndex(centres, 200)).toBe(2);
  });

  it("drops last when right of every other tab", () => {
    expect(dropIndex(centres, 400)).toBe(3);
  });

  it("handles a single tab", () => {
    expect(dropIndex([], 123)).toBe(0);
  });
});
