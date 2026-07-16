export type ShiftStatus =
  | "before"
  | "soon"
  | "working"
  | "finished";

type ShiftStatusResult = {
  status: ShiftStatus;
  label: string;
};

function toMinutes(time: string) {
  const [hourText, minuteText] = time.slice(0, 5).split(":");

  const hour = Number(hourText);
  const minute = Number(minuteText);

  return hour * 60 + minute;
}

export function getShiftStatus(
  workDate: string,
  startTime: string,
  endTime: string
): ShiftStatusResult {
  const now = new Date();

  const todayText = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  if (workDate < todayText) {
    return {
      status: "finished",
      label: "退勤済み",
    };
  }

  if (workDate > todayText) {
    return {
      status: "before",
      label: "出勤予定",
    };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = toMinutes(startTime);
  let endMinutes = toMinutes(endTime);

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  let adjustedCurrentMinutes = currentMinutes;

  if (currentMinutes < startMinutes && endMinutes >= 24 * 60) {
    adjustedCurrentMinutes += 24 * 60;
  }

  if (
    adjustedCurrentMinutes >= startMinutes &&
    adjustedCurrentMinutes < endMinutes
  ) {
    return {
      status: "working",
      label: "出勤中",
    };
  }

  const minutesUntilStart = startMinutes - currentMinutes;

  if (minutesUntilStart > 0 && minutesUntilStart <= 30) {
    return {
      status: "soon",
      label: "まもなく出勤",
    };
  }

  if (adjustedCurrentMinutes >= endMinutes) {
    return {
      status: "finished",
      label: "退勤済み",
    };
  }

  return {
    status: "before",
    label: "出勤予定",
  };
}