import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm font-bold text-blue-600">404</p>

        <h1 className="mt-2 text-xl font-bold text-gray-900">
          ページが見つかりません
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          URLが正しいか確認してください。
        </p>

        <Link
          href="/"
          className="mt-5 block w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white"
        >
          ホームへ戻る
        </Link>
      </div>
    </main>
  );
}