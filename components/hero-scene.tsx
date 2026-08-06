"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Tunables for the constellation field. Kept deliberately small/cheap --
// this is decorative chrome behind a form-heavy demo, not the product,
// so it should never compete for GPU/CPU budget with the real work.
const PARTICLE_COUNT = 110;
const CONNECTION_DISTANCE = 2.3; // world units; closer pairs get a connecting line
const FIELD_RADIUS = 6.5;
const ACCENT = "#2dd4bf"; // teal -- reads as "data / signal" without the generic AI-purple cliche

// `useSyncExternalStore` plumbing for prefers-reduced-motion. Defined at
// module scope so the subscribe/snapshot functions are stable across
// renders (required by the hook to avoid re-subscribing every render).
function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getReducedMotionServerSnapshot() {
  // No `window` on the server -- default to motion-on; the client snapshot
  // reconciles immediately after hydration if the user's OS says otherwise.
  return false;
}

/**
 * The particle field + its connecting lines.
 *
 * Positions and edges are computed ONCE on mount (useMemo), not re-simulated
 * every frame. The "floating" look comes from slowly rotating the whole
 * group instead of moving individual particles -- that's an O(1) per-frame
 * cost instead of O(n^2), which is what keeps this smooth on integrated
 * GPUs during a live demo.
 */
function ConstellationField({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const baseRotation = useRef(0);
  const pointerRaw = useRef({ x: 0, y: 0 });
  const pointerSmooth = useRef({ x: 0, y: 0 });

  // Lazy `useState` initializer, not `useMemo`: the memoized value from
  // `useMemo` is only a perf hint -- React is allowed to discard and
  // recompute it, which would silently reshuffle every particle mid-session
  // since Math.random() is impure. A lazy initializer is contractually
  // guaranteed to run exactly once per mounted instance, which is what a
  // one-time random layout actually needs.
  const [{ positions, linePositions }] = useState(() => {
    const points: THREE.Vector3[] = Array.from({ length: PARTICLE_COUNT }, () => {
      return new THREE.Vector3(
        (Math.random() - 0.5) * FIELD_RADIUS * 2,
        (Math.random() - 0.5) * FIELD_RADIUS * 1.3,
        (Math.random() - 0.5) * FIELD_RADIUS
      );
    });

    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => p.toArray(positions, i * 3));

    // Only connect nearby points -- an all-pairs mesh at this density would
    // just look like noise instead of a constellation. This is O(n^2) but
    // runs once, so it's a non-issue at n=110.
    const lines: number[] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < CONNECTION_DISTANCE) {
          lines.push(...points[i].toArray(), ...points[j].toArray());
        }
      }
    }

    return { positions, linePositions: new Float32Array(lines) };
  });

  // Track the pointer on `window` (not the canvas) so the parallax effect
  // doesn't require the canvas to capture pointer events -- the canvas stays
  // pointer-events:none and never intercepts clicks on the page above it.
  useEffect(() => {
    if (reducedMotion) return;
    const handleMove = (e: PointerEvent) => {
      pointerRaw.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRaw.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [reducedMotion]);

  useFrame((state, delta) => {
    if (!groupRef.current || reducedMotion) return;

    // Smooth the raw pointer toward its target instead of snapping straight
    // to it, so parallax feels like drift rather than a jitter.
    pointerSmooth.current.x += (pointerRaw.current.x - pointerSmooth.current.x) * delta * 2;
    pointerSmooth.current.y += (pointerRaw.current.y - pointerSmooth.current.y) * delta * 2;

    baseRotation.current += delta * 0.03;
    groupRef.current.rotation.y = baseRotation.current + pointerSmooth.current.x * 0.25;
    groupRef.current.rotation.x =
      Math.sin(state.clock.elapsedTime * 0.15) * 0.06 + pointerSmooth.current.y * 0.1;
  });

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={ACCENT} transparent opacity={0.12} depthWrite={false} />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color={ACCENT}
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/**
 * Full-bleed animated background for the landing page hero. Represents
 * "connections" and "data" -- the two things this product is built on
 * (relationship history + researched facts) -- as a literal network.
 */
export default function HeroScene() {
  // Respect prefers-reduced-motion: freeze the field instead of animating
  // it. Judges/users with motion sensitivity still see the visual, just
  // not moving. `useSyncExternalStore` (rather than an effect that mirrors
  // matchMedia into state) is the React-sanctioned way to read an external,
  // subscribable value like this -- it also gives us a safe SSR snapshot
  // for free, since `window` doesn't exist on the server.
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  return (
    <Canvas
      camera={{ position: [0, 0, 8.5], fov: 45 }}
      // Cap device pixel ratio -- full retina DPR on a full-viewport canvas
      // is the single biggest perf cost for a scene this simple, with no
      // visible quality gain.
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      className="!absolute inset-0"
    >
      <ConstellationField reducedMotion={reducedMotion} />
    </Canvas>
  );
}
