export type BusinessHours = {
  openMinutes: number;
  closeMinutes: number;
};

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  openMinutes: 9 * 60,
  closeMinutes: 30 * 60,
};

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(time: string): number {
  const [hourText, minuteText] = time
    .slice(0, 5)
    .split(":");

  return Number(hourText) * 60 + Number(minuteText);
}

export function getBusinessDate(
  date: Date,
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): string {
  const currentMinutes =
    date.getHours() * 60 + date.getMinutes();
  const closingMinutesAfterMidnight =
    hours.closeMinutes - 24 * 60;
  const businessDate = new Date(date);

  if (
    hours.closeMinutes >= 24 * 60 &&
    currentMinutes < closingMinutesAfterMidnight
  ) {
    businessDate.setDate(businessDate.getDate() - 1);
  }

  return formatLocalDate(businessDate);
}

export function getExtendedEndMinutes(
  startTime: string,
  endTime: string
): number {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  return endMinutes <= startMinutes
    ? endMinutes + 24 * 60
    : endMinutes;
}

export function formatExtendedTime(
  startTime: string,
  endTime: string
): string {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = getExtendedEndMinutes(
    startTime,
    endTime
  );

  return `${formatMinutesAsTime(
    startMinutes
  )}〜${formatMinutesAsTime(endMinutes)}`;
}

export function formatMinutesAsTime(
  totalMinutes: number
): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}`;
}

export function isWithinBusinessHours(
  date: Date,
  hours: BusinessHours = DEFAULT_BUSINESS_HOURS
): boolean {
  let currentMinutes =
    date.getHours() * 60 + date.getMinutes();

  if (
    hours.closeMinutes >= 24 * 60 &&
    currentMinutes <
      hours.closeMinutes - 24 * 60
  ) {
    currentMinutes += 24 * 60;
  }

  return (
    currentMinutes >= hours.openMinutes &&
    currentMinutes < hours.closeMinutes
  );
}
