import { supabase } from "@/lib/supabase";
import { requireActiveStoreId } from "@/services/store.service";

export type Cast = {
  id: string;
  name: string;
  display_name: string | null;
  status: string;
  memo: string | null;
};

export async function getActiveCasts(): Promise<Cast[]> {
  const storeId = requireActiveStoreId();
  const { data, error } = await supabase
    .from("casts")
    .select("id, name, display_name, status, memo")
    .eq("store_id", storeId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as Cast[]) || [];
}

export async function createCast(
  name: string
): Promise<void> {
  const storeId = requireActiveStoreId();
  const { error } = await supabase.from("casts").insert({
    store_id: storeId,
    name,
    display_name: name,
    status: "active",
  });

  if (error) throw error;
}

export async function deactivateCast(
  id: string
): Promise<void> {
  const storeId = requireActiveStoreId();
  const { error } = await supabase
    .from("casts")
    .update({ status: "inactive" })
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) throw error;
}

export async function getInactiveCasts(): Promise<
  Cast[]
> {
  const storeId = requireActiveStoreId();
  const { data, error } = await supabase
    .from("casts")
    .select("id, name, display_name, status, memo")
    .eq("store_id", storeId)
    .eq("status", "inactive")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as Cast[]) || [];
}

export async function activateCast(
  id: string
): Promise<void> {
  const storeId = requireActiveStoreId();
  const { error } = await supabase
    .from("casts")
    .update({ status: "active" })
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) throw error;
}

export async function getCastShiftCount(
  id: string
): Promise<number> {
  const storeId = requireActiveStoreId();
  const { count, error } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("cast_id", id);

  if (error) throw error;
  return count ?? 0;
}

export async function permanentlyDeleteInactiveCast(
  id: string
): Promise<void> {
  const storeId = requireActiveStoreId();

  const { data: cast, error: castError } = await supabase
    .from("casts")
    .select("id, status")
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle();

  if (castError) throw castError;

  if (!cast) {
    throw new Error(
      "削除対象のキャストが見つかりません"
    );
  }

  if (cast.status !== "inactive") {
    throw new Error(
      "在籍中のキャストは完全削除できません"
    );
  }

  const { error } = await supabase
    .from("casts")
    .delete()
    .eq("store_id", storeId)
    .eq("id", id)
    .eq("status", "inactive");

  if (error) throw error;
}

export type UpdateCastInput = {
  name?: string;
  display_name?: string | null;
  memo?: string | null;
};

export async function updateCastById(
  id: string,
  input: UpdateCastInput
): Promise<void> {
  const storeId = requireActiveStoreId();
  const { error } = await supabase
    .from("casts")
    .update(input)
    .eq("store_id", storeId)
    .eq("id", id);

  if (error) throw error;
}

export async function checkCastNameConflict(
  name: string,
  excludeCastId?: string
): Promise<boolean> {
  const storeId = requireActiveStoreId();
  const normalizedName = name.trim().toLowerCase();
  const { data, error } = await supabase
    .from("casts")
    .select("id, name, display_name")
    .eq("store_id", storeId);

  if (error) throw error;

  return (data ?? []).some((cast) => {
    if (cast.id === excludeCastId) return false;

    const castName = cast.name.trim().toLowerCase();
    const displayName = (cast.display_name || "")
      .trim()
      .toLowerCase();

    return (
      castName === normalizedName ||
      displayName === normalizedName
    );
  });
}
