// Brand mark: a sparkline rising to a current-value dot. The mark animates
// in on first paint — the line "draws itself" left-to-right and the trailing
// dot pulses briefly. Honors prefers-reduced-motion via the `tu-spark-draw`
// keyframe living in globals.css; when the user opts out the line shows
// fully-drawn with no animation.
//
// Use `<Logomark className="…"/>` to size — defaults to 24px square.
// Pair with `<Wordmark />` for the full brand lockup.

export function Logomark({
  className = "h-6 w-6",
  animated = true,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 64 48"
      className={className}
      fill="none"
      stroke="currentColor"
      aria-hidden
    >
      <path
        d="M4 38 L 13 22 L 22 31 L 32 13 L 42 24 L 52 8 L 60 16"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className={animated ? "tu-spark-draw" : undefined}
      />
      <circle
        cx="60"
        cy="16"
        r="3.5"
        fill="currentColor"
        stroke="none"
        className={animated ? "tu-spark-dot" : undefined}
      />
    </svg>
  );
}

// Wordmark with the central 'u' painted in the accent. Splitting at the 'u'
// reads as "token-u-sage" — the bridge letter both halves share.
export function Wordmark({
  className = "text-base",
}: {
  className?: string;
}) {
  return (
    <span
      className={`font-medium tracking-tight ${className}`}
      style={{ fontFamily: "var(--font-geist-mono), ui-monospace, monospace" }}
    >
      <span className="text-fg-strong">token</span>
      <span className="text-accent">u</span>
      <span className="text-fg-strong">sage</span>
    </span>
  );
}
