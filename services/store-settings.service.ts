import { supabase } from "@/lib/supabase";
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
} from "@/lib/business-time";

type StoreSettingsRow = {
  business_open_minutes: number;
  business_close_minutes: number;
};

export async function getBusinessHours(): Promise<BusinessHours> {
  const { data, error } = await supabase
    .from("store_settings")
    .select(
      "business_open_minutes, business_close_minutes"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return DEFAULT_BUSINESS_HOURS;
  }

  const settings = data as StoreSettingsRow;

  return {
    openMinutes: settings.business_open_minutes,
    closeMinutes: settings.business_close_minutes,
  };
}

export async function updateBusinessHours(
  hours: BusinessHours
): Promise<void> {
  const { error } = await supabase
    .from("store_settings")
    .update({
      business_open_minutes: hours.openMinutes,
      business_close_minutes: hours.closeMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  if (error) {
    throw error;
  }
}
