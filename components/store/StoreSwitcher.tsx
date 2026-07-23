"use client";

import { useStore } from "@/components/store/StoreProvider";

export default function StoreSwitcher({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) {
  const {
    stores,
    currentStore,
    currentStoreId,
    changeStore,
  } = useStore();

  return (
    <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-3">
        <label className="block text-xs font-bold text-gray-500">
          表示中の店舗
        </label>

        {currentStore.role === "admin" &&
          onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-bold text-gray-700"
            >
              店舗設定
            </button>
          )}
      </div>

      {stores.length === 1 ? (
        <p className="font-bold text-gray-900">
          {currentStore.name}
        </p>
      ) : (
        <select
          value={currentStoreId}
          onChange={(event) =>
            changeStore(event.target.value)
          }
          className="w-full rounded-xl border border-gray-300 bg-white p-3 font-bold text-gray-900 outline-none focus:border-gray-900"
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </select>
      )}
    </section>
  );
}
