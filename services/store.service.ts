import { supabase } from "@/lib/supabase";

const ACTIVE_STORE_KEY = "mens-esthe-active-store-id";

export type StoreRole = "admin" | "staff";

export type Store = {
  id: string;
  name: string;
  is_active: boolean;
  role: StoreRole;
};

export type StoreBusinessHours = {
  store_id: string;
  business_open_minutes: number;
  business_close_minutes: number;
};

export type StoreMember = {
  user_id: string;
  email: string | null;
  role: StoreRole;
};

type StoreRelation = {
  id: string;
  name: string;
  is_active: boolean;
};

type StoreMemberRow = {
  role: StoreRole;
  stores: StoreRelation | StoreRelation[] | null;
};

function firstRelation<T>(
  relation: T | T[] | null
): T | null {
  if (!relation) return null;
  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

export async function getMyStores(): Promise<Store[]> {
  const { data, error } = await supabase
    .from("store_members")
    .select(
      `
        role,
        stores!inner (
          id,
          name,
          is_active
        )
      `
    )
    .eq("stores.is_active", true);

  if (error) throw error;

  const storeRows = (
    (data ?? []) as unknown as StoreMemberRow[]
  )
    .map((row) => {
      const store = firstRelation(row.stores);
      if (!store) return null;

      return {
        id: store.id,
        name: store.name,
        is_active: store.is_active,
        role: row.role,
      };
    })
    .filter((store): store is Store => store !== null);

  const uniqueStores = new Map<string, Store>();

  for (const store of storeRows) {
    const existing = uniqueStores.get(store.id);

    if (
      !existing ||
      (existing.role === "staff" &&
        store.role === "admin")
    ) {
      uniqueStores.set(store.id, store);
    }
  }

  return Array.from(uniqueStores.values()).sort(
    (first, second) =>
      first.name.localeCompare(second.name, "ja")
  );
}

export function getSavedStoreId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_STORE_KEY);
}

export function saveActiveStoreId(
  storeId: string
): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_STORE_KEY, storeId);
}

export function clearActiveStoreId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_STORE_KEY);
}

export function requireActiveStoreId(): string {
  const storeId = getSavedStoreId();

  if (!storeId) {
    throw new Error(
      "店舗が選択されていません。画面を再読み込みしてください。"
    );
  }

  return storeId;
}

export async function updateStoreName(
  storeId: string,
  name: string
): Promise<void> {
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error("店舗名を入力してください。");
  }

  const { error } = await supabase
    .from("stores")
    .update({
      name: normalizedName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId);

  if (error) throw error;
}

export async function getStoreBusinessHours(
  storeId: string
): Promise<StoreBusinessHours> {
  const { data, error } = await supabase
    .from("store_business_hours")
    .select(
      "store_id, business_open_minutes, business_close_minutes"
    )
    .eq("store_id", storeId)
    .single();

  if (error) throw error;
  return data as StoreBusinessHours;
}

export async function updateStoreBusinessHours(
  storeId: string,
  openMinutes: number,
  closeMinutes: number
): Promise<void> {
  if (
    openMinutes < 0 ||
    openMinutes >= 1440 ||
    closeMinutes <= openMinutes ||
    closeMinutes > 2880
  ) {
    throw new Error("営業時間が正しくありません。");
  }

  const { error } = await supabase
    .from("store_business_hours")
    .upsert(
      {
        store_id: storeId,
        business_open_minutes: openMinutes,
        business_close_minutes: closeMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    );

  if (error) throw error;
}

export async function createStore(
  name: string,
  openMinutes: number,
  closeMinutes: number
): Promise<string> {
  const { data, error } = await supabase.rpc(
    "create_store_with_admin",
    {
      new_store_name: name.trim(),
      open_minutes: openMinutes,
      close_minutes: closeMinutes,
    }
  );

  if (error) throw error;
  return data as string;
}

export async function addStoreMemberByEmail(
  storeId: string,
  email: string,
  role: StoreRole
): Promise<void> {
  const { error } = await supabase.rpc(
    "add_store_member_by_email",
    {
      target_store_id: storeId,
      target_email: email.trim(),
      member_role: role,
    }
  );

  if (error) throw error;
}

export async function getStoreMembers(
  storeId: string
): Promise<StoreMember[]> {
  const { data: memberData, error: memberError } =
    await supabase
      .from("store_members")
      .select("user_id, role")
      .eq("store_id", storeId)
      .order("created_at", { ascending: true });

  if (memberError) throw memberError;

  const members = (memberData ?? []) as {
    user_id: string;
    role: StoreRole;
  }[];
  const userIds = members.map((member) => member.user_id);

  if (userIds.length === 0) return [];

  const { data: profileData, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, email")
      .in("id", userIds);

  if (profileError) throw profileError;

  const emailById = new Map(
    (profileData ?? []).map((profile) => [
      profile.id,
      profile.email as string | null,
    ])
  );

  return members.map((member) => ({
    user_id: member.user_id,
    email: emailById.get(member.user_id) ?? null,
    role: member.role,
  }));
}

export async function updateStoreMemberRole(
  storeId: string,
  userId: string,
  role: StoreRole
): Promise<void> {
  const { error } = await supabase
    .from("store_members")
    .update({
      role,
      updated_at: new Date().toISOString(),
    })
    .eq("store_id", storeId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function removeStoreMember(
  storeId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("store_members")
    .delete()
    .eq("store_id", storeId)
    .eq("user_id", userId);

  if (error) throw error;
}
