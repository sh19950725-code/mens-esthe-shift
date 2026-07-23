"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function registerServiceWorker() {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service Worker登録エラー:", error);
      });
    }

    if (document.readyState === "complete") registerServiceWorker();
    else window.addEventListener("load", registerServiceWorker, { once: true });

    return () => window.removeEventListener("load", registerServiceWorker);
  }, []);

  return null;
}
