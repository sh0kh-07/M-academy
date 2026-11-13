export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
