"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearActiveStoreId,
  getMyStores,
  getSavedStoreId,
  saveActiveStoreId,
  type Store,
} from "@/services/store.service";

type StoreContextValue = {
  stores: Store[];
  currentStore: Store;
  currentStoreId: string;
  changeStore: (storeId: string) => void;
  reloadStores: () => Promise<void>;
};

const StoreContext =
  createContext<StoreContextValue | null>(null);

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error(
      "useStoreはStoreProviderの内側で使用してください。"
    );
  }

  return context;
}

export default function StoreProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStoreId, setCurrentStoreId] =
    useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadStores() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const storeData = await getMyStores();
      setStores(storeData);

      if (storeData.length === 0) {
        clearActiveStoreId();
        setCurrentStoreId("");
        return;
      }

      const savedStoreId = getSavedStoreId();
      const selectedStore =
        storeData.find(
          (store) => store.id === savedStoreId
        ) ?? storeData[0];

      saveActiveStoreId(selectedStore.id);
      setCurrentStoreId(selectedStore.id);
    } catch (error) {
      console.error("店舗情報取得エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "店舗情報を取得できませんでした。"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadStores();
  }, []);

  function changeStore(storeId: string) {
    const exists = stores.some(
      (store) => store.id === storeId
    );

    if (!exists) return;

    saveActiveStoreId(storeId);
    setCurrentStoreId(storeId);
  }

  const currentStore = useMemo(
    () =>
      stores.find(
        (store) => store.id === currentStoreId
      ) ?? null,
    [currentStoreId, stores]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">
          店舗情報を読み込んでいます...
        </p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <section className="w-full max-w-sm rounded-2xl border border-red-100 bg-red-50 p-5">
          <p className="font-bold text-red-700">
            店舗情報を取得できませんでした
          </p>
          <p className="mt-2 text-sm text-red-600">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => void loadStores()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            再読み込み
          </button>
        </section>
      </div>
    );
  }

  if (!currentStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <section className="w-full max-w-sm rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
          <p className="font-bold text-yellow-800">
            所属店舗がありません
          </p>
          <p className="mt-2 text-sm text-yellow-700">
            管理者に店舗への追加を依頼してください。
          </p>
        </section>
      </div>
    );
  }

  return (
    <StoreContext.Provider
      value={{
        stores,
        currentStore,
        currentStoreId,
        changeStore,
        reloadStores: loadStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
