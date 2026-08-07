// Single easing curve used across every scroll-reveal / entrance animation
// in the app, so motion reads as one system instead of a pile of one-off
// tweens. Springs (hover/tap on buttons, in components/motion-button.tsx and
// components/get-started-button.tsx) are a different animation model --
// stiffness/damping, not a duration+ease curve -- so they don't use this.
export const EASE = [0.16, 1, 0.3, 1] as const;
