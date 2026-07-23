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

type StoreSelection = {
  storeId: string;
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

  const tokenParts = token.split(".");

  if (tokenParts.length !== 3) {
    throw new Error("UNAUTHORIZED");
  }

  let userId = "";

  try {
    const base64 = tokenParts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(
        Math.ceil(tokenParts[1].length / 4) * 4,
        "="
      );
    const payload = JSON.parse(
      Buffer.from(base64, "base64").toString("utf8")
    ) as {
      sub?: string;
      exp?: number;
    };

    if (
      !payload.sub ||
      (payload.exp &&
        payload.exp <= Math.floor(Date.now() / 1000))
    ) {
      throw new Error("INVALID_TOKEN");
    }

    userId = payload.sub;
  } catch {
    throw new Error("UNAUTHORIZED");
  }

  // AuthのgetUser()ではなく、通常のアプリと同じ
  // PostgREST + RLS経路でトークンを検証します。
  // ES256移行後の一部プロジェクトで発生する
  // Auth Admin APIのkid検証不整合を回避できます。
  const userClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
  const { data: profile, error: profileError } =
    await userClient
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

  const currentProfile = profile as {
    id?: string;
    role?: UserRole;
  } | null;

  if (
    profileError ||
    currentProfile?.id !== userId ||
    currentProfile?.role !== "admin"
  ) {
    throw new Error("FORBIDDEN");
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

  return {
    adminClient,
    currentUser: { id: userId },
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

function normalizeStoreSelections(
  value: unknown
): StoreSelection[] {
  if (!Array.isArray(value)) return [];

  const selections = new Map<string, StoreRole>();

  for (const item of value) {
    if (
      typeof item !== "object" ||
      item === null ||
      !("storeId" in item) ||
      typeof item.storeId !== "string" ||
      !item.storeId
    ) {
      continue;
    }

    const role: StoreRole =
      "role" in item && item.role === "admin"
        ? "admin"
        : "staff";
    selections.set(item.storeId, role);
  }

  return Array.from(selections, ([storeId, role]) => ({
    storeId,
    role,
  }));
}

async function replaceMemberships(
  adminClient: SupabaseClient,
  userId: string,
  selections: StoreSelection[]
) {
  if (selections.length === 0) {
    throw new Error(
      "所属店舗を1つ以上選択してください"
    );
  }

  const storeIds = selections.map(
    (selection) => selection.storeId
  );
  const { data: validStores, error: storeError } =
    await adminClient
      .from("stores")
      .select("id")
      .in("id", storeIds)
      .eq("is_active", true);

  if (storeError) throw storeError;

  if ((validStores ?? []).length !== storeIds.length) {
    throw new Error(
      "選択された店舗の一部が見つかりません"
    );
  }

  const { data: currentRows, error: currentError } =
    await adminClient
      .from("store_members")
      .select("store_id, role")
      .eq("user_id", userId);

  if (currentError) throw currentError;

  const nextRoleByStore = new Map(
    selections.map((selection) => [
      selection.storeId,
      selection.role,
    ])
  );

  for (const row of (currentRows ?? []) as {
    store_id: string;
    role: StoreRole;
  }[]) {
    const nextRole = nextRoleByStore.get(row.store_id);
    const losesAdmin =
      row.role === "admin" &&
      nextRole !== "admin";

    if (!losesAdmin) continue;

    const { count, error } = await adminClient
      .from("store_members")
      .select("user_id", {
        count: "exact",
        head: true,
      })
      .eq("store_id", row.store_id)
      .eq("role", "admin")
      .neq("user_id", userId);

    if (error) throw error;

    if ((count ?? 0) === 0) {
      throw new Error(
        "店舗管理者を0人にすることはできません"
      );
    }
  }

  const { error: upsertError } = await adminClient
    .from("store_members")
    .upsert(
      selections.map((selection) => ({
        store_id: selection.storeId,
        user_id: userId,
        role: selection.role,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "store_id,user_id" }
    );

  if (upsertError) throw upsertError;

  const removedStoreIds = (
    (currentRows ?? []) as {
      store_id: string;
      role: StoreRole;
    }[]
  )
    .map((row) => row.store_id)
    .filter((storeId) => !nextRoleByStore.has(storeId));

  if (removedStoreIds.length > 0) {
    const { error: deleteError } = await adminClient
      .from("store_members")
      .delete()
      .eq("user_id", userId)
      .in("store_id", removedStoreIds);

    if (deleteError) throw deleteError;
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
      role?: UserRole;
      stores?: StoreSelection[];
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const role: UserRole =
      body.role === "admin" ? "admin" : "staff";
    const storeSelections =
      normalizeStoreSelections(body.stores);

    if (!email || !email.includes("@")) {
      throw new Error(
        "正しいメールアドレスを入力してください"
      );
    }

    if (storeSelections.length === 0) {
      throw new Error(
        "所属店舗を1つ以上選択してください"
      );
    }

    const redirectTo = new URL(request.url).origin;
    const { data, error } =
      await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo,
          data: {
            must_change_password: true,
          },
        }
      );

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

      await replaceMemberships(
        adminClient,
        data.user.id,
        storeSelections
      );
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
      action?:
        | "disable"
        | "enable"
        | "role"
        | "memberships"
        | "approve-registration"
        | "reject-registration";
      requestId?: string;
      role?: UserRole;
      stores?: StoreSelection[];
    };

    if (!body.userId || !body.action) {
      throw new Error("操作内容が正しくありません");
    }

    if (
      body.action === "approve-registration" ||
      body.action === "reject-registration"
    ) {
      if (!body.requestId) {
        throw new Error("申請情報が指定されていません");
      }

      const { data: requestRow, error: requestError } =
        await adminClient
          .from("registration_requests")
          .select("id, user_id, status, email")
          .eq("id", body.requestId)
          .maybeSingle();

      if (requestError) throw requestError;
      if (
        !requestRow ||
        requestRow.user_id !== body.userId
      ) {
        throw new Error(
          "申請とアカウントの情報が一致しません"
        );
      }
      if (
        requestRow.status !== "pending" &&
        requestRow.status !== "processing"
      ) {
        throw new Error(
          "この申請はすでに処理されています"
        );
      }

      if (body.action === "reject-registration") {
        const { error: statusError } = await adminClient
          .from("registration_requests")
          .update({
            status: "rejected",
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.requestId);

        if (statusError) throw statusError;

        const { error: deleteError } =
          await adminClient.auth.admin.deleteUser(
            body.userId
          );
        if (deleteError) throw deleteError;

        return NextResponse.json({ ok: true });
      }

      const selections =
        normalizeStoreSelections(body.stores);
      if (selections.length === 0) {
        throw new Error(
          "所属店舗を1つ以上選択してください"
        );
      }

      const role: UserRole =
        body.role === "admin" ? "admin" : "staff";

      const { error: profileError } =
        await adminClient.from("profiles").upsert(
          {
            id: body.userId,
            email: requestRow.email,
            role,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
      if (profileError) throw profileError;

      await replaceMemberships(
        adminClient,
        body.userId,
        selections
      );

      const { error: enableError } =
        await adminClient.auth.admin.updateUserById(
          body.userId,
          {
            ban_duration: "none",
            user_metadata: {
              registration_pending: false,
              must_change_password: false,
            },
          }
        );
      if (enableError) throw enableError;

      const { error: completeError } =
        await adminClient
          .from("registration_requests")
          .update({
            status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", body.requestId);
      if (completeError) throw completeError;

      return NextResponse.json({ ok: true });
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

    if (body.action === "memberships") {
      await replaceMemberships(
        adminClient,
        body.userId,
        normalizeStoreSelections(body.stores)
      );
    } else if (body.action === "role") {
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
