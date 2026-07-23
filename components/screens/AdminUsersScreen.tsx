"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/components/store/StoreProvider";
import {
  createLoginUser,
  getAdminUsers,
  permanentlyDeleteLoginUser,
  setLoginUserDisabled,
  setLoginUserRole,
  type AdminUser,
} from "@/services/admin-user.service";
import type {
  UserRole,
} from "@/services/profile.service";
import type {
  StoreRole,
} from "@/services/store.service";

type AdminUsersScreenProps = {
  onBack?: () => void;
};

function formatDate(value: string | null): string {
  if (!value) return "未ログイン";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminUsersScreen({
  onBack,
}: AdminUsersScreenProps) {
  const { stores, currentStoreId } = useStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [currentUserId, setCurrentUserId] =
    useState("");
  const [searchText, setSearchText] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<UserRole>("staff");
  const [storeId, setStoreId] =
    useState(currentStoreId);
  const [storeRole, setStoreRole] =
    useState<StoreRole>("staff");
  const [isCreating, setIsCreating] =
    useState(false);
  const [workingUserId, setWorkingUserId] =
    useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] =
    useState("");

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const [{ data }, userData] = await Promise.all([
        supabase.auth.getUser(),
        getAdminUsers(),
      ]);
      setCurrentUserId(data.user?.id ?? "");
      setUsers(userData);
    } catch (error) {
      console.error("ユーザー一覧取得エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ユーザー一覧の取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const keyword = searchText
      .trim()
      .toLowerCase();
    if (!keyword) return users;
    return users.filter((user) =>
      (user.email ?? user.id)
        .toLowerCase()
        .includes(keyword)
    );
  }, [searchText, users]);

  async function handleCreateUser() {
    if (!email.trim()) {
      alert("メールアドレスを入力してください");
      return;
    }
    if (password.length < 8) {
      alert("初期パスワードは8文字以上です");
      return;
    }

    try {
      setIsCreating(true);
      await createLoginUser({
        email,
        password,
        role,
        storeId,
        storeRole,
      });
      setEmail("");
      setPassword("");
      setRole("staff");
      setStoreRole("staff");
      await loadUsers();
      alert("ログインアカウントを発行しました");
    } catch (error) {
      console.error("アカウント発行エラー:", error);
      alert(
        error instanceof Error
          ? error.message
          : "アカウント発行に失敗しました"
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function changeRole(
    user: AdminUser,
    nextRole: UserRole
  ) {
    if (user.id === currentUserId) {
      alert("自分自身の権限は変更できません");
      return;
    }
    if (
      !confirm(
        `${user.email ?? user.id}を${
          nextRole === "admin"
            ? "管理者"
            : "一般スタッフ"
        }へ変更しますか？`
      )
    ) {
      return;
    }

    try {
      setWorkingUserId(user.id);
      await setLoginUserRole(user.id, nextRole);
      await loadUsers();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "権限変更に失敗しました"
      );
    } finally {
      setWorkingUserId("");
    }
  }

  async function toggleDisabled(user: AdminUser) {
    const nextDisabled = !user.disabled;
    if (
      !confirm(
        `${user.email ?? user.id}を${
          nextDisabled ? "利用停止" : "利用再開"
        }しますか？`
      )
    ) {
      return;
    }

    try {
      setWorkingUserId(user.id);
      await setLoginUserDisabled(
        user.id,
        nextDisabled
      );
      await loadUsers();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "利用状態の変更に失敗しました"
      );
    } finally {
      setWorkingUserId("");
    }
  }

  async function deleteUser(user: AdminUser) {
    const label = user.email ?? user.id;
    if (
      !confirm(
        `${label}を完全削除しますか？\n店舗への所属情報も削除され、元に戻せません。`
      )
    ) {
      return;
    }
    const typed = prompt(
      `確認のため「${label}」と入力してください`
    );
    if (typed !== label) {
      if (typed !== null) {
        alert("入力内容が一致しません");
      }
      return;
    }

    try {
      setWorkingUserId(user.id);
      await permanentlyDeleteLoginUser(user.id);
      await loadUsers();
      alert("ユーザーを完全削除しました");
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "ユーザー削除に失敗しました"
      );
    } finally {
      setWorkingUserId("");
    }
  }

  return (
    <>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            管理者専用
          </p>
          <h1 className="text-2xl font-bold">
            ユーザー管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            発行・権限・利用状態を管理できます
          </p>
        </div>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border bg-white px-3 py-2 text-sm font-bold"
          >
            戻る
          </button>
        )}
      </header>

      <section className="mb-5 rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="font-bold">
          新しいアカウントを発行
        </h2>
        <div className="mt-3 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="メールアドレス"
            className="w-full rounded-xl border p-3"
          />
          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="初期パスワード（8文字以上）"
            className="w-full rounded-xl border p-3"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as UserRole)
              }
              className="rounded-xl border p-3 text-sm"
            >
              <option value="staff">
                システム：一般
              </option>
              <option value="admin">
                システム：管理者
              </option>
            </select>
            <select
              value={storeId}
              onChange={(event) =>
                setStoreId(event.target.value)
              }
              className="rounded-xl border p-3 text-sm"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <select
            value={storeRole}
            onChange={(event) =>
              setStoreRole(
                event.target.value as StoreRole
              )
            }
            className="w-full rounded-xl border p-3 text-sm"
          >
            <option value="staff">
              店舗権限：一般スタッフ
            </option>
            <option value="admin">
              店舗権限：店舗管理者
            </option>
          </select>
          <button
            type="button"
            onClick={() => void handleCreateUser()}
            disabled={isCreating}
            className="w-full rounded-xl bg-gray-900 p-3 font-bold text-white disabled:opacity-50"
          >
            {isCreating
              ? "発行中..."
              : "アカウントを発行"}
          </button>
        </div>
      </section>

      <section className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-blue-50 p-3">
          <p className="text-xs text-blue-700">
            全ユーザー
          </p>
          <p className="mt-1 text-xl font-bold">
            {users.length}名
          </p>
        </div>
        <div className="rounded-2xl bg-purple-50 p-3">
          <p className="text-xs text-purple-700">
            管理者
          </p>
          <p className="mt-1 text-xl font-bold">
            {
              users.filter(
                (user) => user.role === "admin"
              ).length
            }
            名
          </p>
        </div>
        <div className="rounded-2xl bg-red-50 p-3">
          <p className="text-xs text-red-700">
            利用停止
          </p>
          <p className="mt-1 text-xl font-bold">
            {
              users.filter((user) => user.disabled)
                .length
            }
            名
          </p>
        </div>
      </section>

      <input
        type="search"
        value={searchText}
        onChange={(event) =>
          setSearchText(event.target.value)
        }
        placeholder="メールアドレスで検索"
        className="mb-4 w-full rounded-xl border p-3"
      />

      {errorMessage && (
        <p className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      {isLoading ? (
        <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-500">
          読み込み中...
        </p>
      ) : (
        <section className="space-y-3">
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentUserId;
            const isWorking =
              workingUserId === user.id;
            const membership = user.memberships.find(
              (item) =>
                item.store_id === currentStoreId
            );

            return (
              <article
                key={user.id}
                className="rounded-2xl border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {user.email ??
                        "メールアドレス未設定"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isSelf
                        ? "あなたのアカウント"
                        : `最終ログイン：${formatDate(
                            user.last_sign_in_at
                          )}`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      表示中の店舗：
                      {membership
                        ? membership.role === "admin"
                          ? "店舗管理者"
                          : "一般スタッフ"
                        : "所属なし"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1 text-right">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {user.role === "admin"
                        ? "管理者"
                        : "一般"}
                    </span>
                    {user.disabled && (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                        利用停止中
                      </span>
                    )}
                  </div>
                </div>

                {!isSelf && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        void changeRole(
                          user,
                          user.role === "admin"
                            ? "staff"
                            : "admin"
                        )
                      }
                      disabled={isWorking}
                      className="rounded-xl bg-purple-50 px-2 py-2 text-xs font-bold text-purple-700 disabled:opacity-40"
                    >
                      {user.role === "admin"
                        ? "一般に変更"
                        : "管理者に変更"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void toggleDisabled(user)
                      }
                      disabled={isWorking}
                      className={`rounded-xl px-2 py-2 text-xs font-bold disabled:opacity-40 ${
                        user.disabled
                          ? "bg-green-50 text-green-700"
                          : "bg-orange-50 text-orange-700"
                      }`}
                    >
                      {user.disabled
                        ? "利用再開"
                        : "利用停止"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void deleteUser(user)
                      }
                      disabled={isWorking}
                      className="col-span-2 rounded-xl bg-red-600 px-2 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      完全削除
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
