/**
 * ─── Atlas Platform — PWA Hooks & Utilities ───
 * Install prompt, offline detection, viewport helpers.
 */

"use client";

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";

// ─── Install Prompt ─────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  return { canInstall, install };
}

// ─── Online/Offline Detection ───────────────────────────
function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getOnlineServerSnapshot() {
  return true;
}

export function useOnlineStatus() {
  return useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
}

// ─── Standalone Mode Detection ──────────────────────────
function subscribeStandalone(callback: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getStandaloneSnapshot() {
  const mq = window.matchMedia("(display-mode: standalone)");
  return mq.matches || ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true);
}

function getStandaloneServerSnapshot() {
  return false;
}

export function useStandaloneMode() {
  return useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, getStandaloneServerSnapshot);
}

// ─── Viewport & Safe Area ───────────────────────────────
export function useViewport() {
  const [viewport, setViewport] = useState({ width: 0, height: 0, isMobile: false });

  useEffect(() => {
    const update = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return viewport;
}

// ─── Service Worker Registration ────────────────────────
export function useServiceWorker() {
  const [swStatus, setSwStatus] = useState<"idle" | "installing" | "active" | "error">("idle");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.installing) {
          setSwStatus("installing");
          reg.installing.addEventListener("statechange", () => {
            if (reg.active) setSwStatus("active");
          });
        } else if (reg.active) {
          setSwStatus("active");
        }
      })
      .catch(() => setSwStatus("error"));
  }, []);

  return swStatus;
}
