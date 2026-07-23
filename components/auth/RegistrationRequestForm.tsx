"use client";

import { FormEvent, useState } from "react";
import { createRegistrationRequest } from "@/services/registration-request.service";

export default function RegistrationRequestForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [desiredStore, setDesiredStore] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("お名前を入力してください");
      return;
    }
    if (!email.trim()) {
      setErrorMessage("メールアドレスを入力してください");
      return;
    }

    try {
      setIsSubmitting(true);
      await createRegistrationRequest({
        name,
        email,
        desiredStore,
        message,
      });
      setName("");
      setEmail("");
      setDesiredStore("");
      setMessage("");
      setSuccessMessage(
        "利用申請を受け付けました。管理者からの連絡をお待ちください。"
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "利用申請の送信に失敗しました"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mt-5 border-t border-gray-200 pt-5">
      <button
        type="button"
        onClick={() => {
          setIsOpen((current) => !current);
          setErrorMessage("");
        }}
        className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800"
        aria-expanded={isOpen}
      >
        {isOpen ? "利用申請を閉じる" : "新しく利用申請する"}
      </button>

      {isOpen && (
        <form
          onSubmit={submitRequest}
          className="mt-4 space-y-3 rounded-2xl bg-gray-50 p-4"
        >
          <div>
            <label
              htmlFor="request-name"
              className="mb-1 block text-sm font-bold text-gray-700"
            >
              お名前
            </label>
            <input
              id="request-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-900"
              placeholder="山田 太郎"
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="request-email"
              className="mb-1 block text-sm font-bold text-gray-700"
            >
              メールアドレス
            </label>
            <input
              id="request-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-900"
              placeholder="staff@example.com"
              maxLength={255}
            />
          </div>

          <div>
            <label
              htmlFor="request-store"
              className="mb-1 block text-sm font-bold text-gray-700"
            >
              希望店舗
            </label>
            <input
              id="request-store"
              value={desiredStore}
              onChange={(event) =>
                setDesiredStore(event.target.value)
              }
              disabled={isSubmitting}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-900"
              placeholder="例：本店"
              maxLength={100}
            />
          </div>

          <div>
            <label
              htmlFor="request-message"
              className="mb-1 block text-sm font-bold text-gray-700"
            >
              管理者への連絡事項（任意）
            </label>
            <textarea
              id="request-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={isSubmitting}
              className="min-h-24 w-full rounded-xl border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-gray-900"
              placeholder="所属や担当など"
              maxLength={500}
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
            >
              {errorMessage}
            </p>
          )}
          {successMessage && (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-50"
          >
            {isSubmitting ? "送信中..." : "この内容で利用申請する"}
          </button>
        </form>
      )}
    </div>
  );
}
