"use client";

import { AuthPanel } from "./auth-panel";

export function HomeAuthCard() {
  return <AuthPanel onAuthChange={() => undefined} />;
}
