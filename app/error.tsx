"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("画面エラー:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-3xl">
          !
        </div>
        <h1 className="mt-5 text-xl font-bold text-gray-900">
          画面を表示できませんでした
        </h1>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          一時的な通信エラーの可能性があります。もう一度お試しください。
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-5 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white"
        >
          もう一度試す
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = "/";
          }}
          className="mt-2 w-full rounded-2xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-700"
        >
          ホームへ戻る
        </button>

        {error.digest && (
          <p className="mt-4 text-[10px] text-gray-400">
            エラー番号：{error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
