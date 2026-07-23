"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getShiftsByDate,
  type Shift,
} from "@/services/shift.service";

const SETTINGS_KEY = "staffing-alert-settings-v1";
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 29;

type HourlyStaffing = {
  hour: number;
  count: number;
  castNames: string[];
};

function getTodayText(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function getCastName(shift: Shift): string {
  return (
    shift.casts?.display_name ||
    shift.casts?.name ||
    "未設定"
  );
}

function formatHour(hour: number): string {
  return `${hour % 24}:00`;
}

function calculateHourlyStaffing(
  shifts: Shift[],
  startHour: number,
  endHour: number
): HourlyStaffing[] {
  return Array.from(
    { length: endHour - startHour },
    (_, index) => startHour + index
  ).map((hour) => {
    const slotStart = hour * 60;
    const slotEnd = slotStart + 60;
    const active = shifts.filter((shift) => {
      if (shift.status === "holiday") return false;

      let start = timeToMinutes(shift.start_time);
      let end = timeToMinutes(shift.end_time);
      if (start < 6 * 60) start += 24 * 60;
      if (end <= start) end += 24 * 60;

      return start < slotEnd && end > slotStart;
    });

    const uniqueCasts = new Map<string, string>();
    active.forEach((shift) => {
      uniqueCasts.set(shift.cast_id, getCastName(shift));
    });

    return {
      hour,
      count: uniqueCasts.size,
      castNames: [...uniqueCasts.values()],
    };
  });
}

export default function StaffingAlertPanel() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [minimumStaff, setMinimumStaff] = useState(2);
  const [startHour, setStartHour] = useState(
    DEFAULT_START_HOUR
  );
  const [endHour, setEndHour] = useState(DEFAULT_END_HOUR);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadShifts() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      setShifts(await getShiftsByDate(getTodayText()));
    } catch (error) {
      console.error("人員状況取得エラー:", error);
      setErrorMessage("人員状況を取得できませんでした。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings = JSON.parse(saved) as {
          minimumStaff?: number;
          startHour?: number;
          endHour?: number;
        };
        if (
          typeof settings.minimumStaff === "number" &&
          settings.minimumStaff >= 1 &&
          settings.minimumStaff <= 20
        ) {
          setMinimumStaff(settings.minimumStaff);
        }
        const savedStart =
          typeof settings.startHour === "number" &&
          settings.startHour >= 9 &&
          settings.startHour <= 24
            ? settings.startHour
            : DEFAULT_START_HOUR;
        const savedEnd =
          typeof settings.endHour === "number" &&
          settings.endHour > savedStart &&
          settings.endHour <= 29
            ? settings.endHour
            : DEFAULT_END_HOUR;
        setStartHour(savedStart);
        setEndHour(savedEnd);
      }
    } catch (error) {
      console.error("人員設定の読込エラー:", error);
    } finally {
      setSettingsLoaded(true);
    }

    void loadShifts();
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    window.localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        minimumStaff,
        startHour,
        endHour,
      })
    );
  }, [minimumStaff, startHour, endHour, settingsLoaded]);

  const hourly = useMemo(
    () =>
      calculateHourlyStaffing(
        shifts,
        startHour,
        endHour
      ),
    [shifts, startHour, endHour]
  );
  const shortages = hourly.filter(
    (slot) => slot.count < minimumStaff
  );
  const peakCount = Math.max(
    0,
    ...hourly.map((slot) => slot.count)
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">本日の運営</p>
          <h2 className="text-lg font-bold text-gray-900">
            人員不足アラート
          </h2>
        </div>
        <button
          type="button"
          onClick={() => void loadShifts()}
          className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600"
        >
          更新
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 p-3">
        <label className="flex items-center justify-between text-sm font-bold text-gray-700">
          最低必要人数
          <select
            value={minimumStaff}
            onChange={(event) =>
              setMinimumStaff(Number(event.target.value))
            }
            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
          >
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <option key={count} value={count}>
                {count}名
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-gray-600">
            監視開始
            <select
              value={startHour}
              onChange={(event) => {
                const next = Number(event.target.value);
                setStartHour(next);
                if (endHour <= next) setEndHour(next + 1);
              }}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
            >
              {Array.from({ length: 16 }, (_, index) => 9 + index).map(
                (hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                )
              )}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-600">
            監視終了
            <select
              value={endHour}
              onChange={(event) =>
                setEndHour(Number(event.target.value))
              }
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm"
            >
              {Array.from(
                { length: 29 - startHour },
                (_, index) => startHour + index + 1
              ).map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          この設定は次回も自動的に引き継がれます
        </p>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-gray-500">
          集計しています...
        </p>
      ) : errorMessage ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
          {errorMessage}
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div
              className={`rounded-2xl p-4 ${
                shortages.length > 0
                  ? "bg-red-50"
                  : "bg-green-50"
              }`}
            >
              <p className="text-xs font-bold text-gray-600">
                不足時間帯
              </p>
              <p
                className={`mt-1 text-2xl font-bold ${
                  shortages.length > 0
                    ? "text-red-700"
                    : "text-green-700"
                }`}
              >
                {shortages.length}枠
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs font-bold text-blue-700">
                最大出勤人数
              </p>
              <p className="mt-1 text-2xl font-bold text-blue-800">
                {peakCount}名
              </p>
            </div>
          </div>

          {shortages.length === 0 ? (
            <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
              すべての時間帯で必要人数を満たしています。
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-bold text-red-700">
                確認が必要な時間帯
              </p>
              {shortages.map((slot) => (
                <div
                  key={slot.hour}
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 p-3"
                >
                  <div>
                    <p className="font-bold text-red-800">
                      {formatHour(slot.hour)}〜
                      {formatHour(slot.hour + 1)}
                    </p>
                    <p className="mt-1 text-xs text-red-600">
                      {slot.castNames.length > 0
                        ? slot.castNames.join("、")
                        : "出勤者なし"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-red-700">
                    {slot.count}名
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
