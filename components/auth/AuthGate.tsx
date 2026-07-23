"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import RegistrationRequestForm from "@/components/auth/RegistrationRequestForm";

type AuthGateProps = {
  children: ReactNode;
};

const AUTO_LOGOUT_MINUTES = 60;
const WARNING_MINUTES = 5;

function getErrorMessage(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("Email not confirmed")) {
    return "メールアドレスの確認が完了していません。";
  }
  return message;
}

export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInactivityWarning, setShowInactivityWarning] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const lastActivityAt = useRef(0);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) setErrorMessage(error.message);
      setSession(data.session);
      setIsChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsChecking(false);
      if (event === "PASSWORD_RECOVERY") {
        setPasswordError("");
        setShowPasswordModal(true);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    lastActivityAt.current = Date.now();

    function recordActivity() {
      lastActivityAt.current = Date.now();
      setShowInactivityWarning(false);
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "touchstart",
    ];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true })
    );

    const timer = window.setInterval(() => {
      const inactiveMinutes =
        (Date.now() - lastActivityAt.current) / (60 * 1000);

      if (inactiveMinutes >= AUTO_LOGOUT_MINUTES) {
        void supabase.auth.signOut();
        setShowInactivityWarning(false);
        return;
      }

      setShowInactivityWarning(
        inactiveMinutes >= AUTO_LOGOUT_MINUTES - WARNING_MINUTES
      );
    }, 30_000);

    return () => {
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity)
      );
      window.clearInterval(timer);
    };
  }, [session]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage("メールアドレスとパスワードを入力してください。");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? getErrorMessage(error.message)
          : "ログインに失敗しました。"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signOut() {
    const confirmed = window.confirm("ログアウトしますか？");
    if (!confirmed) return;

    const { error } = await supabase.auth.signOut();
    if (error) window.alert("ログアウトに失敗しました。");
  }

  async function sendPasswordReset() {
    const resetEmail = email.trim();
    if (!resetEmail) {
      setErrorMessage("先にメールアドレスを入力してください。");
      return;
    }

    try {
      setIsSendingReset(true);
      setErrorMessage("");
      setResetMessage("");
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setResetMessage(
        "パスワード再設定メールを送信しました。メール内のリンクを開いてください。"
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "再設定メールの送信に失敗しました。"
      );
    } finally {
      setIsSendingReset(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("確認用パスワードが一致しません。");
      return;
    }

    try {
      setIsChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPasswordModal(false);
      setNewPassword("");
      setConfirmPassword("");
      window.alert("パスワードを変更しました。");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "パスワードの変更に失敗しました。"
      );
    } finally {
      setIsChangingPassword(false);
    }
  }

  if (isChecking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900" />
          <p className="mt-3 text-sm text-gray-500">ログイン状態を確認しています...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-10">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
          <div className="mb-6">
            <p className="text-sm font-bold text-blue-600">STAFF ONLY</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">
              シフト管理へログイン
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              内勤スタッフ用のメールアドレスとパスワードを入力してください。
            </p>
          </div>

          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-sm font-bold text-gray-700"
              >
                メールアドレス
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none transition focus:border-gray-900 disabled:opacity-50"
                placeholder="staff@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-sm font-bold text-gray-700"
              >
                パスワード
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                disabled={isSubmitting}
                className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none transition focus:border-gray-900 disabled:opacity-50"
                placeholder="パスワード"
              />
              <button
                type="button"
                onClick={() => void sendPasswordReset()}
                disabled={isSubmitting || isSendingReset}
                className="mt-2 text-xs font-bold text-blue-600 disabled:opacity-50"
              >
                {isSendingReset
                  ? "再設定メールを送信中..."
                  : "パスワードを忘れた場合"}
              </button>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}
            {resetMessage && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {resetMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gray-900 px-4 py-3 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "ログイン中..." : "ログイン"}
            </button>
          </form>

          <RegistrationRequestForm />
        </div>
      </main>
    );
  }

  return (
    <>
      {showInactivityWarning && (
        <div className="fixed left-1/2 top-3 z-[90] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-orange-200 bg-orange-50 p-3 shadow-lg">
          <p className="text-sm font-bold text-orange-900">
            まもなく自動ログアウトします
          </p>
          <p className="mt-1 text-xs text-orange-700">
            操作がないため、約{WARNING_MINUTES}分以内にログアウトします。
          </p>
          <button
            type="button"
            onClick={() => {
              lastActivityAt.current = Date.now();
              setShowInactivityWarning(false);
            }}
            className="mt-2 w-full rounded-xl bg-orange-600 px-3 py-2 text-xs font-bold text-white"
          >
            ログインを継続する
          </button>
        </div>
      )}
      <div className="mx-auto flex w-full max-w-md justify-end gap-2 px-4 pt-3 sm:fixed sm:right-3 sm:top-3 sm:z-[80] sm:w-auto sm:max-w-none sm:px-0 sm:pt-0">
        <button
          type="button"
          onClick={() => {
            setPasswordError("");
            setShowPasswordModal(true);
          }}
          className="rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-600 shadow-md backdrop-blur"
        >
          パスワード変更
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded-full border border-gray-200 bg-white/95 px-3 py-2 text-xs font-bold text-gray-600 shadow-md backdrop-blur"
        >
          ログアウト
        </button>
      </div>
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={isChangingPassword ? undefined : () => setShowPasswordModal(false)}
        >
          <form
            onSubmit={changePassword}
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">アカウント設定</p>
                <h2 className="text-xl font-bold text-gray-900">パスワード変更</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                disabled={isChangingPassword}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-lg text-gray-600 disabled:opacity-50"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1 block text-sm font-bold text-gray-700">
                  新しいパスワード
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-gray-900 disabled:opacity-50"
                  placeholder="8文字以上"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="mb-1 block text-sm font-bold text-gray-700">
                  新しいパスワード（確認）
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  disabled={isChangingPassword}
                  className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-gray-900 disabled:opacity-50"
                  placeholder="もう一度入力"
                />
              </div>
            </div>

            {passwordError && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {passwordError}
              </p>
            )}

            <button
              type="submit"
              disabled={isChangingPassword}
              className="mt-5 w-full rounded-2xl bg-gray-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChangingPassword ? "変更中..." : "パスワードを変更する"}
            </button>
          </form>
        </div>
      )}
      {children}
    </>
  );
}
