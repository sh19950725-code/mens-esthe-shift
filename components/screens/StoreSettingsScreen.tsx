"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useStore } from "@/components/store/StoreProvider";
import { supabase } from "@/lib/supabase";
import {
  addStoreMemberByEmail,
  createStore,
  getStoreBusinessHours,
  getStoreMembers,
  removeStoreMember,
  updateStoreBusinessHours,
  updateStoreMemberRole,
  updateStoreName,
  type StoreMember,
  type StoreRole,
} from "@/services/store.service";

type StoreSettingsScreenProps = {
  onBack: () => void;
};

type TimeOption = {
  value: number;
  label: string;
};

function createTimeOptions(
  start: number,
  end: number
): TimeOption[] {
  const options: TimeOption[] = [];

  for (let minutes = start; minutes <= end; minutes += 30) {
    const dayOffset = Math.floor(minutes / 1440);
    const minutesInDay = minutes % 1440;
    const hours = Math.floor(minutesInDay / 60);
    const minute = String(minutesInDay % 60).padStart(
      2,
      "0"
    );
    const prefix =
      dayOffset > 0 ? `翌${dayOffset > 1 ? dayOffset : ""}日 ` : "";

    options.push({
      value: minutes,
      label: `${prefix}${hours}:${minute}`,
    });
  }

  return options;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(error.message);
  }

  return "処理に失敗しました。";
}

export default function StoreSettingsScreen({
  onBack,
}: StoreSettingsScreenProps) {
  const {
    currentStore,
    currentStoreId,
    changeStore,
    reloadStores,
  } = useStore();

  const [storeName, setStoreName] = useState(
    currentStore.name
  );
  const [openMinutes, setOpenMinutes] = useState(540);
  const [closeMinutes, setCloseMinutes] =
    useState(1800);
  const [members, setMembers] = useState<
    StoreMember[]
  >([]);
  const [currentUserId, setCurrentUserId] =
    useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] =
    useState<StoreRole>("staff");
  const [newStoreName, setNewStoreName] =
    useState("");
  const [newStoreOpenMinutes, setNewStoreOpenMinutes] =
    useState(540);
  const [
    newStoreCloseMinutes,
    setNewStoreCloseMinutes,
  ] = useState(1800);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const openOptions = useMemo(
    () => createTimeOptions(0, 1410),
    []
  );
  const closeOptions = useMemo(
    () => createTimeOptions(openMinutes + 30, 2880),
    [openMinutes]
  );
  const newStoreCloseOptions = useMemo(
    () =>
      createTimeOptions(
        newStoreOpenMinutes + 30,
        2880
      ),
    [newStoreOpenMinutes]
  );

  const isStoreAdmin = currentStore.role === "admin";

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const [hours, memberData, userResponse] =
        await Promise.all([
          getStoreBusinessHours(currentStoreId),
          getStoreMembers(currentStoreId),
          supabase.auth.getUser(),
        ]);

      setOpenMinutes(hours.business_open_minutes);
      setCloseMinutes(hours.business_close_minutes);
      setMembers(memberData);
      setCurrentUserId(
        userResponse.data.user?.id ?? ""
      );
    } catch (error) {
      console.error("店舗設定取得エラー:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [currentStoreId]);

  useEffect(() => {
    setStoreName(currentStore.name);
    void loadSettings();
  }, [currentStore.name, loadSettings]);

  async function saveBasicSettings() {
    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await Promise.all([
        updateStoreName(currentStoreId, storeName),
        updateStoreBusinessHours(
          currentStoreId,
          openMinutes,
          closeMinutes
        ),
      ]);

      await reloadStores();
      setMessage("店舗設定を保存しました。");
    } catch (error) {
      console.error("店舗設定保存エラー:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function addMember() {
    if (!memberEmail.trim()) {
      setErrorMessage(
        "追加するユーザーのメールアドレスを入力してください。"
      );
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await addStoreMemberByEmail(
        currentStoreId,
        memberEmail,
        memberRole
      );

      setMemberEmail("");
      setMemberRole("staff");
      setMembers(await getStoreMembers(currentStoreId));
      setMessage("所属ユーザーを追加しました。");
    } catch (error) {
      console.error("所属ユーザー追加エラー:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function changeMemberRole(
    userId: string,
    role: StoreRole
  ) {
    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await updateStoreMemberRole(
        currentStoreId,
        userId,
        role
      );

      setMembers(await getStoreMembers(currentStoreId));
      await reloadStores();
      setMessage("ユーザー権限を変更しました。");
    } catch (error) {
      console.error("ユーザー権限変更エラー:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteMember(member: StoreMember) {
    if (member.user_id === currentUserId) {
      setErrorMessage(
        "自分自身を店舗から削除することはできません。"
      );
      return;
    }

    const confirmed = window.confirm(
      `${member.email || "このユーザー"}を店舗から削除しますか？`
    );

    if (!confirmed) return;

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await removeStoreMember(
        currentStoreId,
        member.user_id
      );

      setMembers(await getStoreMembers(currentStoreId));
      setMessage("所属ユーザーを削除しました。");
    } catch (error) {
      console.error("所属ユーザー削除エラー:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  async function addNewStore() {
    if (!newStoreName.trim()) {
      setErrorMessage("新しい店舗名を入力してください。");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const createdStoreId = await createStore(
        newStoreName,
        newStoreOpenMinutes,
        newStoreCloseMinutes
      );

      setNewStoreName("");
      await reloadStores();
      changeStore(createdStoreId);
      setMessage("新しい店舗を作成しました。");
    } catch (error) {
      console.error("店舗作成エラー:", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            管理者メニュー
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            店舗設定
          </h1>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700"
        >
          戻る
        </button>
      </header>

      {message && (
        <p className="mb-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
          {message}
        </p>
      )}

      {errorMessage && (
        <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-gray-500">
          読み込み中...
        </p>
      ) : !isStoreAdmin ? (
        <section className="rounded-2xl border border-yellow-100 bg-yellow-50 p-5">
          <p className="font-bold text-yellow-800">
            編集権限がありません
          </p>
          <p className="mt-2 text-sm text-yellow-700">
            店舗設定を変更できるのは店舗管理者だけです。
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              基本設定
            </h2>

            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold text-gray-700">
                店舗名
              </span>
              <input
                value={storeName}
                onChange={(event) =>
                  setStoreName(event.target.value)
                }
                className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-gray-900"
              />
            </label>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-sm font-bold text-gray-700">
                  開店時間
                </span>
                <select
                  value={openMinutes}
                  onChange={(event) => {
                    const nextOpen = Number(
                      event.target.value
                    );
                    setOpenMinutes(nextOpen);

                    if (closeMinutes <= nextOpen) {
                      setCloseMinutes(nextOpen + 30);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3"
                >
                  {openOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-bold text-gray-700">
                  閉店時間
                </span>
                <select
                  value={closeMinutes}
                  onChange={(event) =>
                    setCloseMinutes(
                      Number(event.target.value)
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white p-3"
                >
                  {closeOptions.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => void saveBasicSettings()}
              disabled={isSaving}
              className="mt-4 w-full rounded-xl bg-gray-900 p-3 font-bold text-white disabled:opacity-50"
            >
              設定を保存
            </button>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              所属ユーザー
            </h2>

            <div className="mt-4 space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="rounded-xl border border-gray-200 p-3"
                >
                  <p className="truncate text-sm font-bold text-gray-900">
                    {member.email || member.user_id}
                  </p>

                  <div className="mt-2 flex gap-2">
                    <select
                      value={member.role}
                      disabled={
                        isSaving ||
                        member.user_id === currentUserId
                      }
                      onChange={(event) =>
                        void changeMemberRole(
                          member.user_id,
                          event.target.value as StoreRole
                        )
                      }
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white p-2 text-sm"
                    >
                      <option value="staff">
                        スタッフ
                      </option>
                      <option value="admin">
                        管理者
                      </option>
                    </select>

                    <button
                      type="button"
                      disabled={
                        isSaving ||
                        member.user_id === currentUserId
                      }
                      onClick={() =>
                        void deleteMember(member)
                      }
                      className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-40"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-3">
              <p className="text-sm font-bold text-gray-700">
                ユーザーを追加
              </p>
              <input
                type="email"
                value={memberEmail}
                onChange={(event) =>
                  setMemberEmail(event.target.value)
                }
                placeholder="user@example.com"
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3"
              />
              <select
                value={memberRole}
                onChange={(event) =>
                  setMemberRole(
                    event.target.value as StoreRole
                  )
                }
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white p-3"
              >
                <option value="staff">スタッフ</option>
                <option value="admin">管理者</option>
              </select>
              <button
                type="button"
                onClick={() => void addMember()}
                disabled={isSaving}
                className="mt-2 w-full rounded-lg bg-gray-800 p-3 font-bold text-white disabled:opacity-50"
              >
                店舗へ追加
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              新しい店舗
            </h2>

            <input
              value={newStoreName}
              onChange={(event) =>
                setNewStoreName(event.target.value)
              }
              placeholder="新しい店舗名"
              className="mt-4 w-full rounded-xl border border-gray-300 p-3"
            />

            <div className="mt-3 grid grid-cols-2 gap-3">
              <select
                value={newStoreOpenMinutes}
                onChange={(event) => {
                  const nextOpen = Number(
                    event.target.value
                  );
                  setNewStoreOpenMinutes(nextOpen);

                  if (
                    newStoreCloseMinutes <= nextOpen
                  ) {
                    setNewStoreCloseMinutes(
                      nextOpen + 30
                    );
                  }
                }}
                className="rounded-xl border border-gray-300 bg-white p-3"
              >
                {openOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={newStoreCloseMinutes}
                onChange={(event) =>
                  setNewStoreCloseMinutes(
                    Number(event.target.value)
                  )
                }
                className="rounded-xl border border-gray-300 bg-white p-3"
              >
                {newStoreCloseOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => void addNewStore()}
              disabled={isSaving}
              className="mt-3 w-full rounded-xl border border-gray-900 bg-white p-3 font-bold text-gray-900 disabled:opacity-50"
            >
              店舗を作成
            </button>
          </section>
        </div>
      )}
    </>
  );
}
