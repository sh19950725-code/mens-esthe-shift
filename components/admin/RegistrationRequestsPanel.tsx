"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import {
  approveRegistrationRequest,
  rejectRegistrationRequest,
  type UserStoreSelection,
} from "@/services/admin-user.service";
import {
  deleteRegistrationRequest,
  getRegistrationRequests,
  type RegistrationRequest,
  type RegistrationRequestStatus,
} from "@/services/registration-request.service";
import type { UserRole } from "@/services/profile.service";
import type { StoreRole } from "@/services/store.service";

type RegistrationRequestsPanelProps = {
  onApproved?: () => Promise<void> | void;
};

const STATUS_LABELS: Record<
  RegistrationRequestStatus,
  string
> = {
  pending: "承認待ち",
  processing: "対応中",
  completed: "承認済み",
  rejected: "却下",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RegistrationRequestsPanel({
  onApproved,
}: RegistrationRequestsPanelProps) {
  const { stores, currentStoreId } = useStore();
  const [requests, setRequests] = useState<
    RegistrationRequest[]
  >([]);
  const [filter, setFilter] = useState<
    RegistrationRequestStatus | "all"
  >("pending");
  const [editingId, setEditingId] = useState("");
  const [selectedStores, setSelectedStores] =
    useState<Record<string, StoreRole>>({});
  const [systemRole, setSystemRole] =
    useState<UserRole>("staff");
  const [isLoading, setIsLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setRequests(await getRegistrationRequests());
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "利用申請の取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const visibleRequests = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter(
            (request) => request.status === filter
          ),
    [filter, requests]
  );

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  function openApproval(request: RegistrationRequest) {
    setEditingId(request.id);
    setSystemRole("staff");
    setSelectedStores(
      currentStoreId
        ? { [currentStoreId]: "staff" }
        : {}
    );
  }

  function toggleStore(storeId: string) {
    setSelectedStores((current) => {
      const next = { ...current };
      if (next[storeId]) {
        delete next[storeId];
      } else {
        next[storeId] = "staff";
      }
      return next;
    });
  }

  function toSelections(): UserStoreSelection[] {
    return Object.entries(selectedStores).map(
      ([storeId, role]) => ({
        storeId,
        role,
      })
    );
  }

  async function approve(request: RegistrationRequest) {
    if (!request.user_id) {
      alert(
        "この申請は旧形式です。申請者にもう一度申請してもらってください。"
      );
      return;
    }

    const selections = toSelections();
    if (selections.length === 0) {
      alert("所属店舗を1つ以上選択してください");
      return;
    }
    if (
      !confirm(
        `${request.name}さんの利用申請を承認しますか？`
      )
    ) {
      return;
    }

    try {
      setWorkingId(request.id);
      await approveRegistrationRequest({
        requestId: request.id,
        userId: request.user_id,
        role: systemRole,
        stores: selections,
      });
      setEditingId("");
      await loadRequests();
      await onApproved?.();
      alert(
        "利用申請を承認しました。申請者は登録したメールアドレスとパスワードでログインできます。"
      );
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "利用申請の承認に失敗しました"
      );
    } finally {
      setWorkingId("");
    }
  }

  async function reject(request: RegistrationRequest) {
    if (!request.user_id) {
      alert(
        "旧形式の申請は「申請を削除」を使用してください。"
      );
      return;
    }
    if (
      !confirm(
        `${request.name}さんの利用申請を却下しますか？`
      )
    ) {
      return;
    }

    try {
      setWorkingId(request.id);
      await rejectRegistrationRequest({
        requestId: request.id,
        userId: request.user_id,
      });
      setEditingId("");
      await loadRequests();
      await onApproved?.();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "利用申請の却下に失敗しました"
      );
    } finally {
      setWorkingId("");
    }
  }

  async function removeRequest(
    request: RegistrationRequest
  ) {
    if (
      !confirm(
        `${request.email}の申請履歴を削除しますか？`
      )
    ) {
      return;
    }
    try {
      setWorkingId(request.id);
      await deleteRegistrationRequest(request.id);
      await loadRequests();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "申請履歴の削除に失敗しました"
      );
    } finally {
      setWorkingId("");
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-blue-700">
            利用申請
          </p>
          <h2 className="text-lg font-bold text-gray-900">
            アカウント承認
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            承認待ち {pendingCount}件
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRequests()}
          className="rounded-xl border px-3 py-2 text-xs font-bold"
        >
          更新
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {(
          [
            ["pending", "承認待ち"],
            ["completed", "承認済み"],
            ["rejected", "却下"],
            ["all", "すべて"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
              filter === value
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <p className="mt-3 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-700">
          読み込み中...
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {visibleRequests.map((request) => {
            const isWorking = workingId === request.id;
            const isEditing = editingId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-2xl border p-4"
              >
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold">
                      {request.name}
                    </p>
                    <p className="break-all text-sm text-gray-700">
                      {request.email}
                    </p>
                  </div>
                  <span className="h-fit shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {STATUS_LABELS[request.status]}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p>
                    <span className="font-bold">
                      希望店舗：
                    </span>
                    {request.desired_store || "指定なし"}
                  </p>
                  {request.message && (
                    <p className="whitespace-pre-wrap rounded-xl bg-gray-50 p-2">
                      {request.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    申請日時：{formatDate(request.created_at)}
                  </p>
                </div>

                {request.status === "pending" && (
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() =>
                        isEditing
                          ? setEditingId("")
                          : openApproval(request)
                      }
                      disabled={isWorking}
                      className="w-full rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white"
                    >
                      {isEditing
                        ? "承認設定を閉じる"
                        : "所属店舗を設定して承認"}
                    </button>

                    {isEditing && (
                      <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                        <label className="block text-sm font-bold">
                          システム権限
                          <select
                            value={systemRole}
                            onChange={(event) =>
                              setSystemRole(
                                event.target
                                  .value as UserRole
                              )
                            }
                            className="mt-1 w-full rounded-xl border bg-white p-2"
                          >
                            <option value="staff">
                              一般スタッフ
                            </option>
                            <option value="admin">
                              システム管理者
                            </option>
                          </select>
                        </label>

                        <fieldset>
                          <legend className="text-sm font-bold">
                            所属店舗（複数選択可）
                          </legend>
                          <div className="mt-2 space-y-2">
                            {stores.map((store) => {
                              const selectedRole =
                                selectedStores[store.id];
                              return (
                                <div
                                  key={store.id}
                                  className="flex items-center gap-2 rounded-xl border bg-white p-2"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(
                                      selectedRole
                                    )}
                                    onChange={() =>
                                      toggleStore(store.id)
                                    }
                                    className="h-5 w-5"
                                  />
                                  <span className="min-w-0 flex-1 truncate text-sm font-bold">
                                    {store.name}
                                  </span>
                                  {selectedRole && (
                                    <select
                                      value={selectedRole}
                                      onChange={(event) =>
                                        setSelectedStores(
                                          (current) => ({
                                            ...current,
                                            [store.id]:
                                              event.target
                                                .value as StoreRole,
                                          })
                                        )
                                      }
                                      className="rounded-lg border p-1 text-xs"
                                    >
                                      <option value="staff">
                                        一般
                                      </option>
                                      <option value="admin">
                                        店舗管理者
                                      </option>
                                    </select>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </fieldset>

                        <button
                          type="button"
                          onClick={() =>
                            void approve(request)
                          }
                          disabled={isWorking}
                          className="w-full rounded-xl bg-emerald-700 px-3 py-3 font-bold text-white disabled:opacity-50"
                        >
                          {isWorking
                            ? "承認中..."
                            : "この内容で承認"}
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => void reject(request)}
                      disabled={isWorking}
                      className="w-full rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800"
                    >
                      申請を却下
                    </button>
                  </div>
                )}

                {request.status !== "pending" && (
                  <button
                    type="button"
                    onClick={() =>
                      void removeRequest(request)
                    }
                    disabled={isWorking}
                    className="mt-3 w-full rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                  >
                    申請履歴を削除
                  </button>
                )}
              </article>
            );
          })}

          {visibleRequests.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-700">
              該当する申請はありません
            </p>
          )}
        </div>
      )}
    </section>
  );
}
