import { useSyncExternalStore } from "react";

const SCROLLED_AFTER = 16;

function subscribe(onChange: () => void): () => void {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function isScrolled(): boolean {
  return window.scrollY > SCROLLED_AFTER;
}

function isScrolledOnServer(): boolean {
  return false;
}

export function useScrolled(): boolean {
  return useSyncExternalStore(subscribe, isScrolled, isScrolledOnServer);
}
