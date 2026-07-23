"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "#f3f4f6",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 360,
              padding: 28,
              borderRadius: 24,
              background: "white",
              textAlign: "center",
              boxShadow: "0 12px 30px rgb(0 0 0 / 8%)",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 22 }}>
              システムを読み込めませんでした
            </h1>
            <p style={{ color: "#6b7280", lineHeight: 1.7, fontSize: 14 }}>
              通信状態を確認して、もう一度お試しください。
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                width: "100%",
                marginTop: 16,
                border: 0,
                borderRadius: 14,
                padding: 13,
                background: "#111827",
                color: "white",
                fontWeight: 700,
              }}
            >
              もう一度試す
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
