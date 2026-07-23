import { supabase } from "@/lib/supabase";
import type {
  StoreRole,
} from "@/services/store.service";
import type {
  UserRole,
} from "@/services/profile.service";

export type AdminUserMembership = {
  user_id: string;
  store_id: string;
  role: StoreRole;
};

export type UserStoreSelection = {
  storeId: string;
  role: StoreRole;
};

export type AdminUser = {
  id: string;
  email: string | null;
  role: UserRole;
  disabled: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  memberships: AdminUserMembership[];
};

async function requestAdminUsers(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  body?: object
) {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session) {
    throw new Error("ログイン情報を確認できません");
  }

  const response = await fetch("/api/admin/users", {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = (await response.json()) as {
    users?: AdminUser[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      result.error ?? "ユーザー管理処理に失敗しました"
    );
  }

  return result;
}

export async function getAdminUsers(): Promise<
  AdminUser[]
> {
  const result = await requestAdminUsers("GET");
  return result.users ?? [];
}

export async function createLoginUser(input: {
  email: string;
  role: UserRole;
  stores: UserStoreSelection[];
}): Promise<void> {
  await requestAdminUsers("POST", input);
}

export async function setLoginUserStores(
  userId: string,
  stores: UserStoreSelection[]
): Promise<void> {
  await requestAdminUsers("PATCH", {
    userId,
    action: "memberships",
    stores,
  });
}

export async function setLoginUserDisabled(
  userId: string,
  disabled: boolean
): Promise<void> {
  await requestAdminUsers("PATCH", {
    userId,
    action: disabled ? "disable" : "enable",
  });
}

export async function setLoginUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  await requestAdminUsers("PATCH", {
    userId,
    action: "role",
    role,
  });
}

export async function permanentlyDeleteLoginUser(
  userId: string
): Promise<void> {
  await requestAdminUsers("DELETE", { userId });
}

export async function approveRegistrationRequest(input: {
  requestId: string;
  userId: string;
  role: UserRole;
  stores: UserStoreSelection[];
}): Promise<void> {
  await requestAdminUsers("PATCH", {
    action: "approve-registration",
    ...input,
  });
}

export async function rejectRegistrationRequest(input: {
  requestId: string;
  userId: string;
}): Promise<void> {
  await requestAdminUsers("PATCH", {
    action: "reject-registration",
    ...input,
  });
}
