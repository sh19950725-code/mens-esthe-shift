"use client";

import {
  formatExtendedTime,
  formatMinutesAsTime,
  getExtendedEndMinutes,
  parseTimeToMinutes,
  type BusinessHours,
} from "@/lib/business-time";
import { getShiftStatus } from "@/lib/time";
import type { Shift } from "@/services/shift.service";

const HOUR_WIDTH = 64;
const NAME_WIDTH = 104;
const ROW_HEIGHT = 58;

type ShiftTimetableProps = {
  shifts: Shift[];
  businessHours: BusinessHours;
  canEdit?: boolean;
  onSelectShift?: (shift: Shift) => void;
};

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function getShiftType(
  shift: Shift
): "working" | "tentative" | "holiday" {
  if (
    shift.status === "tentative" ||
    shift.status === "holiday"
  ) {
    return shift.status;
  }
  return "working";
}

function isWorkingNow(shift: Shift): boolean {
  return (
    getShiftType(shift) === "working" &&
    getShiftStatus(
      shift.work_date,
      shift.start_time,
      shift.end_time
    ).status === "working"
  );
}

function getBarClasses(shift: Shift): string {
  if (isWorkingNow(shift)) {
    return "border-green-600 bg-green-500 text-white";
  }
  return "border-blue-600 bg-blue-500 text-white";
}

function getTimelineMinutes(
  shift: Shift,
  businessHours: BusinessHours
) {
  let start = parseTimeToMinutes(shift.start_time);
  let end = getExtendedEndMinutes(
    shift.start_time,
    shift.end_time
  );

  if (
    businessHours.closeMinutes > 24 * 60 &&
    start < businessHours.openMinutes
  ) {
    start += 24 * 60;
    end += 24 * 60;
  }

  return {
    start: Math.max(start, businessHours.openMinutes),
    end: Math.min(end, businessHours.closeMinutes),
  };
}

export default function ShiftTimetable({
  shifts,
  businessHours,
  canEdit = false,
  onSelectShift,
}: ShiftTimetableProps) {
  const activeShifts = shifts.filter(
    (shift) => getShiftType(shift) === "working"
  );
  const shiftRanges = activeShifts
    .map((shift) => ({
      shift,
      range: getTimelineMinutes(shift, businessHours),
    }))
    .sort(
      (first, second) =>
        first.range.start - second.range.start
    );
  const visibleRanges = shiftRanges.filter(
    ({ range }) => range.end > range.start
  );
  const earliestStart =
    visibleRanges.length > 0
      ? Math.min(
          ...visibleRanges.map(({ range }) => range.start)
        )
      : businessHours.openMinutes;
  const timelineStartMinutes = Math.max(
    businessHours.openMinutes,
    Math.floor(earliestStart / 60) * 60
  );
  const duration =
    businessHours.closeMinutes - timelineStartMinutes;
  const timelineWidth = (duration / 60) * HOUR_WIDTH;
  const hourCount = Math.ceil(duration / 60);
  const hourLabels = Array.from(
    { length: hourCount + 1 },
    (_, index) => timelineStartMinutes + index * 60
  );

  if (activeShifts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <p className="text-sm font-bold text-gray-700">
          表示できるシフトがありません
        </p>
        <p className="mt-1 text-xs text-gray-500">
          検索条件や日付を変更してください
        </p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold">
          <span className="text-gray-700">
            表示開始 {formatMinutesAsTime(timelineStartMinutes)}
            〜{formatMinutesAsTime(businessHours.closeMinutes)}
          </span>
          <Legend color="bg-blue-500" label="通常出勤" />
          <Legend color="bg-green-500" label="出勤中" />
        </div>
      </div>

      {activeShifts.length > 0 && (
        <div className="overflow-x-auto">
          <div
            style={{
              width: NAME_WIDTH + timelineWidth,
              minWidth: "100%",
            }}
          >
            <div
              className="sticky top-0 z-20 flex border-b border-gray-200 bg-white"
              style={{ height: 42 }}
            >
              <div
                className="sticky left-0 z-30 flex shrink-0 items-center border-r border-gray-200 bg-white px-3 text-xs font-bold text-gray-700"
                style={{ width: NAME_WIDTH }}
              >
                キャスト
              </div>
              <div
                className="relative shrink-0"
                style={{ width: timelineWidth }}
              >
                {hourLabels.map((minutes, index) => (
                  <div
                    key={minutes}
                    className="absolute top-0 h-full border-l border-gray-200"
                    style={{ left: index * HOUR_WIDTH }}
                  >
                    <span className="absolute left-1 top-3 whitespace-nowrap text-[10px] font-bold text-gray-600">
                      {formatMinutesAsTime(minutes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {shiftRanges.map(({ shift, range }) => {
              const isVisible = range.end > range.start;
              const displayedStart = Math.max(
                range.start,
                timelineStartMinutes
              );
              const left =
                ((displayedStart - timelineStartMinutes) / 60) *
                HOUR_WIDTH;
              const width = Math.max(
                ((range.end - displayedStart) / 60) *
                  HOUR_WIDTH,
                34
              );

              return (
                <div
                  key={shift.id}
                  className="flex border-b border-gray-100 last:border-b-0"
                  style={{ height: ROW_HEIGHT }}
                >
                  <div
                    className="sticky left-0 z-10 flex shrink-0 items-center border-r border-gray-200 bg-white px-3"
                    style={{ width: NAME_WIDTH }}
                  >
                    <p className="w-full truncate text-sm font-bold text-gray-900">
                      {getCastName(shift)}
                    </p>
                  </div>
                  <div
                    className="relative shrink-0"
                    style={{
                      width: timelineWidth,
                      backgroundImage:
                        "repeating-linear-gradient(to right, transparent 0, transparent 63px, #e5e7eb 63px, #e5e7eb 64px)",
                    }}
                  >
                    {isVisible ? (
                      <button
                        type="button"
                        onClick={() =>
                          canEdit && onSelectShift?.(shift)
                        }
                        disabled={!canEdit}
                        title={`${getCastName(
                          shift
                        )} ${formatExtendedTime(
                          shift.start_time,
                          shift.end_time
                        )}`}
                        className={`absolute top-2 h-10 overflow-hidden rounded-lg border px-2 text-left text-xs font-bold shadow-sm ${getBarClasses(
                          shift
                        )} ${
                          canEdit
                            ? "cursor-pointer active:scale-[0.99]"
                            : "cursor-default"
                        }`}
                        style={{ left, width }}
                      >
                        <span className="block truncate">
                          {formatExtendedTime(
                            shift.start_time,
                            shift.end_time
                          )}
                        </span>
                      </button>
                    ) : (
                      <p className="px-3 py-5 text-xs text-gray-500">
                        営業時間外
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </section>
  );
}

function Legend({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-gray-600">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
