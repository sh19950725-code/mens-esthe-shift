import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.trim()
    .replace(/\/rest\/v1\/?$/, "");
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabaseの管理用環境変数が設定されていません"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function errorResponse(error: unknown) {
  console.error("利用申請APIエラー:", error);

  const message =
    error instanceof Error
      ? error.message
      : "利用申請の送信に失敗しました";

  const isInputError =
    message.includes("入力") ||
    message.includes("8文字") ||
    message.includes("一致") ||
    message.includes("すでに");

  return NextResponse.json(
    { error: message },
    { status: isInputError ? 400 : 500 }
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      desiredStore?: string;
      message?: string;
      password?: string;
      website?: string;
    };

    // 自動送信対策用の隠し項目です。
    if (body.website) {
      return NextResponse.json({ ok: true });
    }

    const name = body.name?.trim() ?? "";
    const email =
      body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const desiredStore =
      body.desiredStore?.trim() || null;
    const message = body.message?.trim() || null;

    if (!name || name.length > 100) {
      throw new Error("お名前を正しく入力してください");
    }
    if (
      !email ||
      !email.includes("@") ||
      email.length > 255
    ) {
      throw new Error(
        "メールアドレスを正しく入力してください"
      );
    }
    if (password.length < 8) {
      throw new Error(
        "パスワードは8文字以上で入力してください"
      );
    }
    if (
      (desiredStore?.length ?? 0) > 100 ||
      (message?.length ?? 0) > 500
    ) {
      throw new Error("入力内容が長すぎます");
    }

    const adminClient = getAdminClient();
    const { data: existingRequest } =
      await adminClient
        .from("registration_requests")
        .select("id")
        .ilike("email", email)
        .in("status", ["pending", "processing"])
        .maybeSingle();

    if (existingRequest) {
      throw new Error(
        "このメールアドレスの申請はすでに受け付けています"
      );
    }

    const { data, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        ban_duration: "876000h",
        user_metadata: {
          registration_pending: true,
          must_change_password: false,
        },
      });

    if (createError) {
      if (
        createError.message
          .toLowerCase()
          .includes("already")
      ) {
        throw new Error(
          "このメールアドレスはすでに登録されています"
        );
      }
      throw createError;
    }

    try {
      const { error: profileError } =
        await adminClient.from("profiles").upsert(
          {
            id: data.user.id,
            email,
            role: "staff",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      const { error: requestError } =
        await adminClient
          .from("registration_requests")
          .insert({
            user_id: data.user.id,
            name,
            email,
            desired_store: desiredStore,
            message,
            status: "pending",
          });

      if (requestError) throw requestError;
    } catch (error) {
      await adminClient.auth.admin.deleteUser(
        data.user.id
      );
      throw error;
    }

    return NextResponse.json(
      { ok: true },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
