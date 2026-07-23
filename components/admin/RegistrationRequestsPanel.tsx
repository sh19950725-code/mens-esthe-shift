"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteRegistrationRequest,
  getRegistrationRequests,
  updateRegistrationRequestStatus,
  type RegistrationRequest,
  type RegistrationRequestStatus,
} from "@/services/registration-request.service";

type RegistrationRequestsPanelProps = {
  onUseRequest: (request: RegistrationRequest) => void;
};

const STATUS_LABELS: Record<
  RegistrationRequestStatus,
  string
> = {
  pending: "未対応",
  processing: "対応中",
  completed: "完了",
  rejected: "却下",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function RegistrationRequestsPanel({
  onUseRequest,
}: RegistrationRequestsPanelProps) {
  const [requests, setRequests] = useState<
    RegistrationRequest[]
  >([]);
  const [filter, setFilter] = useState<
    RegistrationRequestStatus | "all"
  >("pending");
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

  async function changeStatus(
    request: RegistrationRequest,
    status: RegistrationRequestStatus
  ) {
    try {
      setWorkingId(request.id);
      await updateRegistrationRequestStatus(
        request.id,
        status
      );
      await loadRequests();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "申請状態の更新に失敗しました"
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
        `${request.email}の利用申請を削除しますか？`
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
          : "利用申請の削除に失敗しました"
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
            アカウント発行待ち
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            未対応 {pendingCount}件
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadRequests()}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"
        >
          更新
        </button>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["pending", "未対応"],
            ["processing", "対応中"],
            ["completed", "完了"],
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
        <p className="mt-3 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">
          申請を読み込んでいます...
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {visibleRequests.map((request) => {
            const isWorking = workingId === request.id;

            return (
              <article
                key={request.id}
                className="rounded-2xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">
                      {request.name}
                    </p>
                    <p className="break-all text-sm text-gray-700">
                      {request.email}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {STATUS_LABELS[request.status]}
                  </span>
                </div>

                <dl className="mt-3 space-y-1 text-sm text-gray-700">
                  <div>
                    <dt className="inline font-bold">希望店舗：</dt>
                    <dd className="inline">
                      {request.desired_store || "指定なし"}
                    </dd>
                  </div>
                  {request.message && (
                    <div>
                      <dt className="font-bold">連絡事項：</dt>
                      <dd className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 p-2">
                        {request.message}
                      </dd>
                    </div>
                  )}
                  <div className="pt-1 text-xs text-gray-500">
                    申請日時：{formatDate(request.created_at)}
                  </div>
                </dl>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() => {
                      onUseRequest(request);
                      void changeStatus(
                        request,
                        "processing"
                      );
                    }}
                    className="col-span-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                  >
                    発行欄へ反映
                  </button>
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() =>
                      void changeStatus(
                        request,
                        "completed"
                      )
                    }
                    className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 disabled:opacity-50"
                  >
                    完了
                  </button>
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() =>
                      void changeStatus(
                        request,
                        "rejected"
                      )
                    }
                    className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-bold text-orange-800 disabled:opacity-50"
                  >
                    却下
                  </button>
                  {request.status !== "pending" && (
                    <button
                      type="button"
                      disabled={isWorking}
                      onClick={() =>
                        void changeStatus(
                          request,
                          "pending"
                        )
                      }
                      className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-50"
                    >
                      未対応へ戻す
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isWorking}
                    onClick={() =>
                      void removeRequest(request)
                    }
                    className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                  >
                    申請を削除
                  </button>
                </div>
              </article>
            );
          })}

          {visibleRequests.length === 0 && (
            <p className="rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-600">
              該当する利用申請はありません
            </p>
          )}
        </div>
      )}
    </section>
  );
}
