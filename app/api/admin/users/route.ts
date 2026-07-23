import { NextResponse } from "next/server";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UserRole = "admin" | "staff";
type StoreRole = "admin" | "staff";

type ProfileRow = {
  id: string;
  email: string | null;
  role: UserRole;
};

type MembershipRow = {
  user_id: string;
  store_id: string;
  role: StoreRole;
};

function getEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.trim()
    .replace(/\/rest\/v1\/?$/, "");
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Supabaseの管理用環境変数が設定されていません"
    );
  }

  return { url, anonKey, serviceRoleKey };
}

async function authorize(request: Request) {
  const { url, anonKey, serviceRoleKey } =
    getEnvironment();
  const authorization =
    request.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } =
    await authClient.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  const adminClient = createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
  const { data: profile, error: profileError } =
    await adminClient
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

  const currentProfile = profile as {
    role?: UserRole;
  } | null;

  if (
    profileError ||
    currentProfile?.role !== "admin"
  ) {
    throw new Error("FORBIDDEN");
  }

  return {
    adminClient,
    currentUser: data.user,
  };
}

function errorResponse(error: unknown) {
  console.error("ユーザー管理APIエラー:", error);

  if (
    error instanceof Error &&
    error.message === "UNAUTHORIZED"
  ) {
    return NextResponse.json(
      { error: "ログインが必要です" },
      { status: 401 }
    );
  }

  if (
    error instanceof Error &&
    error.message === "FORBIDDEN"
  ) {
    return NextResponse.json(
      { error: "管理者権限が必要です" },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      error:
        error instanceof Error
          ? error.message
          : "処理に失敗しました",
    },
    { status: 500 }
  );
}

function isDisabled(user: User): boolean {
  if (!user.banned_until) return false;
  return new Date(user.banned_until).getTime() > Date.now();
}

async function ensureAnotherAdmin(
  adminClient: SupabaseClient,
  targetUserId: string
) {
  const { data: target, error: targetError } =
    await adminClient
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();

  if (targetError) throw targetError;
  if (target?.role !== "admin") return;

  const { count, error } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (error) throw error;

  if ((count ?? 0) <= 1) {
    throw new Error(
      "最後の管理者は変更・停止・削除できません"
    );
  }
}

export async function GET(request: Request) {
  try {
    const { adminClient } = await authorize(request);
    const { data: userData, error: userError } =
      await adminClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

    if (userError) throw userError;

    const [{ data: profiles, error: profileError }, {
      data: memberships,
      error: membershipError,
    }] = await Promise.all([
      adminClient
        .from("profiles")
        .select("id, email, role"),
      adminClient
        .from("store_members")
        .select("user_id, store_id, role"),
    ]);

    if (profileError) throw profileError;
    if (membershipError) throw membershipError;

    const profileById = new Map(
      ((profiles ?? []) as ProfileRow[]).map(
        (profile) => [profile.id, profile]
      )
    );
    const membershipsByUser = new Map<
      string,
      MembershipRow[]
    >();

    for (const membership of
      (memberships ?? []) as MembershipRow[]) {
      const current =
        membershipsByUser.get(membership.user_id) ?? [];
      current.push(membership);
      membershipsByUser.set(
        membership.user_id,
        current
      );
    }

    const users = userData.users.map((user) => {
      const profile = profileById.get(user.id);

      return {
        id: user.id,
        email: user.email ?? profile?.email ?? null,
        role: profile?.role ?? "staff",
        disabled: isDisabled(user),
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        memberships:
          membershipsByUser.get(user.id) ?? [],
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { adminClient } = await authorize(request);
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: UserRole;
      storeId?: string;
      storeRole?: StoreRole;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const role: UserRole =
      body.role === "admin" ? "admin" : "staff";
    const storeRole: StoreRole =
      body.storeRole === "admin" ? "admin" : "staff";

    if (!email || !email.includes("@")) {
      throw new Error(
        "正しいメールアドレスを入力してください"
      );
    }

    if (password.length < 8) {
      throw new Error(
        "初期パスワードは8文字以上にしてください"
      );
    }

    if (!body.storeId) {
      throw new Error("所属店舗を選択してください");
    }

    const { data, error } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (error) throw error;

    try {
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            email,
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (profileError) throw profileError;

      const { error: memberError } = await adminClient
        .from("store_members")
        .upsert(
          {
            store_id: body.storeId,
            user_id: data.user.id,
            role: storeRole,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "store_id,user_id" }
        );

      if (memberError) throw memberError;
    } catch (error) {
      await adminClient.auth.admin.deleteUser(
        data.user.id
      );
      throw error;
    }

    return NextResponse.json(
      { id: data.user.id },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { adminClient, currentUser } =
      await authorize(request);
    const body = (await request.json()) as {
      userId?: string;
      action?: "disable" | "enable" | "role";
      role?: UserRole;
    };

    if (!body.userId || !body.action) {
      throw new Error("操作内容が正しくありません");
    }

    if (
      body.userId === currentUser.id &&
      body.action !== "enable"
    ) {
      throw new Error(
        "自分自身のアカウントは変更・停止できません"
      );
    }

    if (
      body.action === "disable" ||
      (body.action === "role" &&
        body.role === "staff")
    ) {
      await ensureAnotherAdmin(
        adminClient,
        body.userId
      );
    }

    if (body.action === "role") {
      const role: UserRole =
        body.role === "admin" ? "admin" : "staff";
      const { error } = await adminClient
        .from("profiles")
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq("id", body.userId);

      if (error) throw error;
    } else {
      const { error } =
        await adminClient.auth.admin.updateUserById(
          body.userId,
          {
            ban_duration:
              body.action === "disable"
                ? "876000h"
                : "none",
          }
        );

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { adminClient, currentUser } =
      await authorize(request);
    const body = (await request.json()) as {
      userId?: string;
    };

    if (!body.userId) {
      throw new Error("削除対象が指定されていません");
    }

    if (body.userId === currentUser.id) {
      throw new Error(
        "自分自身のアカウントは削除できません"
      );
    }

    await ensureAnotherAdmin(
      adminClient,
      body.userId
    );

    const { error } =
      await adminClient.auth.admin.deleteUser(
        body.userId
      );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
