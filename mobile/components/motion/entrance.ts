/** Tall sections remain visible after their top scrolls above the viewport. */
export function isWithinViewport(top: number, height: number, viewportTop: number, viewportHeight: number) {
  "worklet";
  return height > 0 && viewportHeight > 0 && top < viewportTop + viewportHeight - 12 && top + height > viewportTop;
}

export function entranceTiming(delay: number, duration: number) {
  return {
    delay: Math.min(Math.max(delay, 0), 160),
    duration: Math.min(Math.max(duration, 200), 460),
  };
}
