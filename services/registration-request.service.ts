import { supabase } from "@/lib/supabase";

export type RegistrationRequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected";

export type RegistrationRequest = {
  id: string;
  user_id: string | null;
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
  password: string;
};

export async function createRegistrationRequest(
  input: CreateRegistrationRequestInput
): Promise<void> {
  const response = await fetch("/api/registration-requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const result = (await response.json()) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      result.error ?? "利用申請の送信に失敗しました"
    );
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
