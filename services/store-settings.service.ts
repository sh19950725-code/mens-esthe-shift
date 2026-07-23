import { supabase } from "@/lib/supabase";
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHours,
} from "@/lib/business-time";
import { requireActiveStoreId } from "@/services/store.service";

type StoreSettingsRow = {
  business_open_minutes: number;
  business_close_minutes: number;
};

export async function getBusinessHours(): Promise<BusinessHours> {
  const storeId = requireActiveStoreId();
  const { data, error } = await supabase
    .from("store_business_hours")
    .select(
      "business_open_minutes, business_close_minutes"
    )
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) throw error;

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
  const storeId = requireActiveStoreId();
  const { error } = await supabase
    .from("store_business_hours")
    .upsert(
      {
        store_id: storeId,
        business_open_minutes: hours.openMinutes,
        business_close_minutes: hours.closeMinutes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" }
    );

  if (error) throw error;
}
