"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  getProfiles,
  updateUserRole,
  type UserProfile,
  type UserRole,
} from "@/services/profile.service";

type AdminUsersScreenProps = {
  onBack?: () => void;
};

export default function AdminUsersScreen({ onBack }: AdminUsersScreenProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const [{ data }, profileData] = await Promise.all([
        supabase.auth.getUser(),
        getProfiles(),
      ]);
      setCurrentUserId(data.user?.id ?? "");
      setProfiles(profileData);
    } catch (error) {
      console.error("スタッフ一覧取得エラー:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "スタッフ一覧の取得に失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredProfiles = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase("ja");
    if (!search) return profiles;
    return profiles.filter((profile) =>
      (profile.email ?? profile.id).toLocaleLowerCase("ja").includes(search)
    );
  }, [profiles, searchText]);

  const adminCount = profiles.filter((profile) => profile.role === "admin").length;

  async function changeRole(profile: UserProfile, nextRole: UserRole) {
    if (profile.id === currentUserId) {
      window.alert("自分自身の権限はこの画面から変更できません。");
      return;
    }
    if (
      profile.role === "admin" &&
      nextRole === "staff" &&
      adminCount <= 1
    ) {
      window.alert("管理者を0人にすることはできません。");
      return;
    }

    const confirmed = window.confirm(
      `${profile.email ?? profile.id}の権限を「${
        nextRole === "admin" ? "管理者" : "一般スタッフ"
      }」へ変更しますか？`
    );
    if (!confirmed) return;

    try {
      setUpdatingUserId(profile.id);
      await updateUserRole(profile.id, nextRole);
      setProfiles((current) =>
        current.map((item) =>
          item.id === profile.id ? { ...item, role: nextRole } : item
        )
      );
    } catch (error) {
      console.error("権限更新エラー:", error);
      window.alert(
        error instanceof Error ? error.message : "権限の変更に失敗しました"
      );
    } finally {
      setUpdatingUserId("");
    }
  }

  return (
    <>
      <header className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">管理者専用</p>
            <h1 className="text-2xl font-bold text-gray-900">スタッフ権限管理</h1>
            <p className="mt-1 text-sm text-gray-500">
              登録済みユーザーの権限を変更できます
            </p>
          </div>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 shadow-sm"
            >
              戻る
            </button>
          )}
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-blue-50 p-4">
          <p className="text-xs font-bold text-blue-700">登録スタッフ</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {profiles.length}<span className="ml-1 text-sm">名</span>
          </p>
        </div>
        <div className="rounded-2xl bg-purple-50 p-4">
          <p className="text-xs font-bold text-purple-700">管理者</p>
          <p className="mt-1 text-2xl font-bold text-purple-900">
            {adminCount}<span className="ml-1 text-sm">名</span>
          </p>
        </div>
      </section>

      <input
        type="search"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder="メールアドレスで検索"
        className="mb-4 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-gray-900"
      />

      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-72 items-center justify-center">
          <p className="text-sm text-gray-500">スタッフを読み込んでいます...</p>
        </div>
      ) : (
        <section className="space-y-2">
          {filteredProfiles.map((profile) => {
            const isCurrentUser = profile.id === currentUserId;
            const isUpdating = updatingUserId === profile.id;
            return (
              <div
                key={profile.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-gray-900">
                      {profile.email || "メールアドレス未設定"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {isCurrentUser ? "あなたのアカウント" : profile.id.slice(0, 8)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                      profile.role === "admin"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {profile.role === "admin" ? "管理者" : "一般スタッフ"}
                  </span>
                </div>

                {!isCurrentUser && (
                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => void changeRole(profile, "staff")}
                      disabled={isUpdating || profile.role === "staff"}
                      className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 disabled:opacity-40"
                    >
                      一般スタッフにする
                    </button>
                    <button
                      type="button"
                      onClick={() => void changeRole(profile, "admin")}
                      disabled={isUpdating || profile.role === "admin"}
                      className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                    >
                      管理者にする
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      <p className="mt-4 rounded-2xl bg-orange-50 p-4 text-xs text-orange-700">
        新しいログインアカウント自体の作成・停止は、Supabaseの
        Authentication → Usersで行ってください。
      </p>
    </>
  );
}
