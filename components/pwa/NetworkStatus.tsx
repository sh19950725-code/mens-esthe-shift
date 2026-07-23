"use client";

import { useEffect, useRef, useState } from "react";

export default function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    wasOffline.current = !navigator.onLine;

    function handleOffline() {
      wasOffline.current = true;
      setShowReconnected(false);
      setIsOnline(false);
    }

    function handleOnline() {
      setIsOnline(true);
      if (wasOffline.current) {
        setShowReconnected(true);
        wasOffline.current = false;
        window.setTimeout(() => setShowReconnected(false), 4000);
      }
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="fixed inset-x-0 top-0 z-[120] bg-red-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
      >
        オフラインです。接続が戻るまで登録・編集を行わないでください。
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        className="fixed left-1/2 top-3 z-[120] -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg"
      >
        インターネットへ再接続しました
      </div>
    );
  }

  return null;
}
