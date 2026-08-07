import { cubicBezier } from "motion-utils";

// Single easing curve used across every scroll-reveal / entrance animation
// in the app, so motion reads as one system instead of a pile of one-off
// tweens. Springs (hover/tap on buttons, in components/motion-button.tsx and
// components/get-started-button.tsx) are a different animation model --
// stiffness/damping, not a duration+ease curve -- so they don't use this.
export const EASE = [0.16, 1, 0.3, 1] as const;

// Duration-based `transition={{ ease: EASE }}` props accept the raw bezier
// tuple directly. Scroll-linked `useTransform(..., { ease })` calls don't --
// they want an actual (t: number) => number function. `motion-utils` is a
// direct dependency of framer-motion (not a random transitive package), so
// importing this converter from it is safe.
export const easeFn = cubicBezier(...EASE);
