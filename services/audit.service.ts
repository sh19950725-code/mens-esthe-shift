import { supabase } from "@/lib/supabase";

export type AuditAction = "INSERT" | "UPDATE" | "DELETE";

export type AuditLog = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  table_name: "casts" | "rooms" | "shifts" | string;
  record_id: string;
  action: AuditAction;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
};

export async function getAuditLogs(limit = 200): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      "id, actor_id, actor_email, table_name, record_id, action, old_data, new_data, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as AuditLog[]) ?? [];
}
