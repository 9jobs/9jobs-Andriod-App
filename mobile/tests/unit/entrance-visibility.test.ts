import { entranceTiming, isWithinViewport } from "@/components/motion/entrance";

describe("scroll entrance visibility", () => {
  it("reveals a section inside the viewport", () => {
    expect(isWithinViewport(180, 100, 100, 600)).toBe(true);
  });
  it("keeps offscreen content pending until it reaches the viewport", () => {
    expect(isWithinViewport(720, 100, 100, 600)).toBe(false);
    expect(isWithinViewport(650, 100, 100, 600)).toBe(true);
  });
  it("reveals tall sections even when their top is above the viewport", () => {
    expect(isWithinViewport(-1000, 2000, 100, 600)).toBe(true);
  });
  it("does not reveal a section completely above the viewport", () => {
    expect(isWithinViewport(-200, 100, 100, 600)).toBe(false);
  });
  it("waits for nonzero layout measurements", () => {
    expect(isWithinViewport(180, 0, 100, 600)).toBe(false);
    expect(isWithinViewport(180, 100, 100, 0)).toBe(false);
  });
  it("avoids long stagger delays that leave content blank during fast scrolling", () => {
    expect(entranceTiming(2000, 2000)).toEqual({delay:160, duration:460});
    expect(entranceTiming(-10, -10)).toEqual({delay:0, duration:200});
    expect(entranceTiming(40, 320)).toEqual({delay:40, duration:320});
  });
});
