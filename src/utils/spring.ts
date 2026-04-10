/**
 * Minimal spring physics simulator.
 * Generates WAAPI-compatible keyframe arrays from spring parameters.
 *
 * Uses a damped harmonic oscillator:
 *   x'' = -stiffness * (x - target) - damping * x'
 *
 * Sampled at fixed steps until the spring settles (velocity + displacement < threshold).
 */

interface SpringConfig {
  stiffness: number;  // spring constant k (higher = snappier)
  damping: number;    // friction d (higher = less bounce)
  mass: number;       // mass m (higher = more inertia)
  precision?: number; // settlement threshold (default 0.001)
}

export const SPRING_PRESETS = {
  /** Relaxed movement for token repositioning (~1.5s) */
  snappy: { stiffness: 120, damping: 20, mass: 1.8 } as SpringConfig,
  /** Gentle entrance with soft settle (~1.8s) */
  gentle: { stiffness: 80, damping: 16, mass: 1.8 } as SpringConfig,
  /** Bouncy with visible overshoot */
  bouncy: { stiffness: 150, damping: 14, mass: 1.8 } as SpringConfig,
  /** Smooth settle for exits (~1.5s) */
  smooth: { stiffness: 90, damping: 22, mass: 1.8 } as SpringConfig,
} as const;

const STEP = 1 / 120; // simulate at 120Hz for accuracy
const MAX_DURATION = 3; // seconds cap

/**
 * Simulate a spring from `from` to `to` and return an array of
 * normalized values (0→1 range where 0=from, 1=to) plus the
 * computed duration in milliseconds.
 */
export function simulateSpring(
  config: SpringConfig,
  from = 0,
  to = 1,
): { values: number[]; duration: number } {
  const { stiffness, damping, mass, precision = 0.001 } = config;
  const range = to - from;
  if (Math.abs(range) < precision) {
    return { values: [1], duration: 0 };
  }

  let x = 0;      // displacement from `from`, normalized (0 = at from, 1 = at to)
  let v = 0;      // velocity
  const values: number[] = [0];
  let t = 0;

  while (t < MAX_DURATION) {
    const springForce = -stiffness * (x - 1); // pull toward target (1)
    const dampingForce = -damping * v;
    const acceleration = (springForce + dampingForce) / mass;

    v += acceleration * STEP;
    x += v * STEP;
    t += STEP;

    values.push(x);

    // Settled?
    if (Math.abs(x - 1) < precision && Math.abs(v) < precision) {
      values.push(1); // ensure we land exactly
      break;
    }
  }

  // Ensure final value is exactly 1
  if (values[values.length - 1] !== 1) values.push(1);

  return {
    values,
    duration: Math.round(t * 1000),
  };
}

/**
 * Generate WAAPI keyframes for a translate(dx, dy) spring animation.
 * Returns { keyframes, duration } ready for element.animate().
 *
 * Samples the spring and produces ~20-40 keyframes (subsampled from 120Hz sim).
 */
export function springTranslateKeyframes(
  dx: number,
  dy: number,
  config: SpringConfig = SPRING_PRESETS.snappy,
): { keyframes: Keyframe[]; duration: number } {
  const { values, duration } = simulateSpring(config);
  // Subsample to ~30 keyframes max for performance
  const step = Math.max(1, Math.floor(values.length / 30));
  const keyframes: Keyframe[] = [];

  for (let i = 0; i < values.length; i += step) {
    const progress = values[i];
    const currentDx = dx * (1 - progress);
    const currentDy = dy * (1 - progress);
    keyframes.push({
      transform: `translate(${currentDx}px,${currentDy}px)`,
      offset: i / (values.length - 1),
    });
  }

  // Ensure last keyframe is exactly at rest
  const last = keyframes[keyframes.length - 1];
  if (last.offset !== 1) {
    keyframes.push({ transform: "translate(0,0)", offset: 1 });
  } else {
    last.transform = "translate(0,0)";
  }

  return { keyframes, duration };
}

/**
 * Generate WAAPI keyframes for a spring-based opacity + scale entrance.
 */
export function springEnterKeyframes(
  config: SpringConfig = SPRING_PRESETS.gentle,
): { keyframes: Keyframe[]; duration: number } {
  const { values, duration } = simulateSpring(config);
  const step = Math.max(1, Math.floor(values.length / 25));
  const keyframes: Keyframe[] = [];

  for (let i = 0; i < values.length; i += step) {
    const p = values[i];
    // Opacity: 0 → 1 (clamped, no overshoot in opacity)
    const opacity = Math.min(1, Math.max(0, p));
    // Scale: 0.92 → 1.0 (spring can overshoot slightly past 1.0)
    const scale = 0.92 + 0.08 * p;
    keyframes.push({
      opacity,
      transform: `scale(${scale})`,
      offset: i / (values.length - 1),
    });
  }

  const last = keyframes[keyframes.length - 1];
  if (last.offset !== 1) {
    keyframes.push({ opacity: 1, transform: "scale(1)", offset: 1 });
  } else {
    last.opacity = 1;
    last.transform = "scale(1)";
  }

  return { keyframes, duration };
}

/**
 * Generate WAAPI keyframes for a spring-based exit (opacity + scale + upward drift).
 */
export function springExitKeyframes(
  config: SpringConfig = SPRING_PRESETS.smooth,
): { keyframes: Keyframe[]; duration: number } {
  const { values, duration } = simulateSpring(config);
  const step = Math.max(1, Math.floor(values.length / 20));
  const keyframes: Keyframe[] = [];

  for (let i = 0; i < values.length; i += step) {
    const p = Math.min(1, Math.max(0, values[i])); // clamp for exit
    keyframes.push({
      opacity: 1 - p,
      transform: `scale(${1 - 0.05 * p}) translateY(${-6 * p}px)`,
      offset: i / (values.length - 1),
    });
  }

  const last = keyframes[keyframes.length - 1];
  if (last.offset !== 1) {
    keyframes.push({ opacity: 0, transform: "scale(0.95) translateY(-6px)", offset: 1 });
  } else {
    last.opacity = 0;
    last.transform = "scale(0.95) translateY(-6px)";
  }

  return { keyframes, duration };
}
