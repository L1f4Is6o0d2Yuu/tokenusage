"use client";

import { useEffect } from "react";
import { bumpFlavorRotation } from "@/app/(app)/leaderboard/actions";

// Fires once after the leaderboard has rendered, asking the server to
// advance the `lb-rot` cookie so the next refresh produces a different
// taunt/praise for every row. Effect-once is fine: if the server
// action fails the user just sees the same line — no UI impact.
export function LeaderboardRotateAfterMount() {
  useEffect(() => {
    void bumpFlavorRotation();
  }, []);
  return null;
}
