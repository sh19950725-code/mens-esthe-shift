"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean(
        (window.navigator as Navigator & {
          standalone?: boolean;
        }).standalone
      ))
  );
}

export default function InstallAppPanel() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIsIos(isIosDevice());
    setInstalled(isStandalone());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(
        event as BeforeInstallPromptEvent
      );
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage("ホーム画面へ追加しました。");
    }

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt
    );
    window.addEventListener(
      "appinstalled",
      handleInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener(
        "appinstalled",
        handleInstalled
      );
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      setMessage(
        "ブラウザのメニューから「ホーム画面に追加」を選択してください。"
      );
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;

      if (choice.outcome === "accepted") {
        setMessage("アプリを追加しています...");
      } else {
        setMessage("インストールをキャンセルしました。");
      }
      setInstallPrompt(null);
    } catch (error) {
      console.error("アプリ追加エラー:", error);
      setMessage("アプリを追加できませんでした。");
    }
  }

  if (installed) {
    return (
      <section className="rounded-2xl border border-green-100 bg-green-50 p-4">
        <p className="font-bold text-green-800">
          アプリとして利用中です
        </p>
        <p className="mt-1 text-sm text-green-700">
          ホーム画面から直接起動できます。
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-sm text-gray-500">
          スマホで便利に
        </p>
        <h2 className="text-lg font-bold text-gray-900">
          ホーム画面へ追加
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          ブラウザを開かず、アプリのように起動できます
        </p>
      </div>

      {isIos ? (
        <div className="mt-4 space-y-2 rounded-2xl bg-blue-50 p-4 text-sm text-blue-800">
          <p className="font-bold">iPhone・iPadでの追加方法</p>
          <p>1. Safari下部の共有ボタンを押します</p>
          <p>2.「ホーム画面に追加」を選びます</p>
          <p>3. 右上の「追加」を押します</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => void installApp()}
          className="mt-4 w-full rounded-xl bg-gray-900 px-4 py-3 font-bold text-white"
        >
          {installPrompt
            ? "この端末へインストール"
            : "追加方法を確認"}
        </button>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600"
        >
          {message}
        </p>
      )}
    </section>
  );
}
