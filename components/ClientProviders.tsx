"use client";

import { useSessionGuard } from "@/lib/useSessionGuard";

export default function ClientProviders() {
  useSessionGuard();
  return null;
}
