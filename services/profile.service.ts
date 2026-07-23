import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "staff";

export type UserProfile = {
  id: string;
  email?: string | null;
  role: UserRole;
};

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  return (data as UserProfile | null) ?? null;
}

export async function getProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as UserProfile[]) ?? [];
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw error;
}
