import { supabase } from "@/lib/supabase";

export type RegistrationRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected";

export type RegistrationRequest = {
  id: string;
  name: string;
  email: string;
  desired_store: string | null;
  message: string | null;
  status: RegistrationRequestStatus;
  created_at: string;
  updated_at: string;
};

export type CreateRegistrationRequestInput = {
  name: string;
  email: string;
  desiredStore?: string;
  message?: string;
};

export async function createRegistrationRequest(
  input: CreateRegistrationRequestInput
): Promise<void> {
  const { error } = await supabase
    .from("registration_requests")
    .insert({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      desired_store: input.desiredStore?.trim() || null,
      message: input.message?.trim() || null,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "このメールアドレスの申請はすでに受け付けています"
      );
    }
    throw error;
  }
}

export async function getRegistrationRequests(): Promise<
  RegistrationRequest[]
> {
  const { data, error } = await supabase
    .from("registration_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as RegistrationRequest[];
}

export async function updateRegistrationRequestStatus(
  id: string,
  status: RegistrationRequestStatus
): Promise<void> {
  const { error } = await supabase
    .from("registration_requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteRegistrationRequest(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("registration_requests")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
