"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Inertial scroll for the landing. Wrapped as a client component so it
// can mount/unmount on its own — dashboard pages skip it (don't render
// the provider) so the data tool pages keep native instant scrolling.
//
// Lenis hijacks wheel/touch into requestAnimationFrame-driven smooth
// transforms. Linear/Vercel/Apple-flavored ease. ~6 KB after gzip.
export function SmoothScrollProvider() {
  useEffect(() => {
    // Honor reduced-motion: anyone who's asked the OS for less motion
    // (vestibular issues, performance, taste) gets native scroll.
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const lenis = new Lenis({
      // Easing tuned to feel like Vercel/Linear — a touch under 1s for
      // long flicks, faster for small wheel ticks. The cubic-bezier
      // gives us the asymmetric "fast in, slow out" perception that
      // reads as "weighty but responsive".
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      // Touch is handled natively on mobile — Lenis's touch path can
      // fight the URL bar on iOS Safari.
      smoothWheel: true,
      syncTouch: false,
    });

    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
