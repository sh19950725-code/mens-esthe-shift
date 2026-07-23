"use client";

import { useEffect, useState } from "react";

type TimeTemplate = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
};

type ShiftTimeTemplatesProps = {
  startTime: string;
  endTime: string;
  onApply: (startTime: string, endTime: string) => void;
  disabled?: boolean;
};

const STORAGE_KEY = "shift-time-templates-v1";

const DEFAULT_TEMPLATES: TimeTemplate[] = [
  {
    id: "default-day",
    label: "昼",
    startTime: "12:00",
    endTime: "18:00",
  },
  {
    id: "default-full",
    label: "通し",
    startTime: "12:00",
    endTime: "20:00",
  },
  {
    id: "default-evening",
    label: "夕方",
    startTime: "17:00",
    endTime: "23:00",
  },
  {
    id: "default-night",
    label: "深夜",
    startTime: "20:00",
    endTime: "23:59",
  },
];

function loadCustomTemplates(): TimeTemplate[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is TimeTemplate =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "label" in item &&
        "startTime" in item &&
        "endTime" in item &&
        typeof item.id === "string" &&
        typeof item.label === "string" &&
        typeof item.startTime === "string" &&
        typeof item.endTime === "string"
    );
  } catch {
    return [];
  }
}

export default function ShiftTimeTemplates({
  startTime,
  endTime,
  onApply,
  disabled = false,
}: ShiftTimeTemplatesProps) {
  const [customTemplates, setCustomTemplates] = useState<
    TimeTemplate[]
  >([]);
  const [newLabel, setNewLabel] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCustomTemplates(loadCustomTemplates());
  }, []);

  function saveTemplates(templates: TimeTemplate[]) {
    setCustomTemplates(templates);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(templates)
    );
  }

  function addCurrentTime() {
    const label = newLabel.trim();
    if (!label) {
      setMessage("テンプレート名を入力してください。");
      return;
    }

    if (!startTime || !endTime || startTime === endTime) {
      setMessage("有効な出勤・退勤時間を入力してください。");
      return;
    }

    const template: TimeTemplate = {
      id: `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,
      label,
      startTime,
      endTime,
    };

    saveTemplates([...customTemplates, template]);
    setNewLabel("");
    setIsEditing(false);
    setMessage("現在の時間を保存しました。");
  }

  function removeTemplate(id: string) {
    saveTemplates(
      customTemplates.filter((template) => template.id !== id)
    );
    setMessage("テンプレートを削除しました。");
  }

  const templates = [
    ...DEFAULT_TEMPLATES,
    ...customTemplates,
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-gray-800">
            よく使う勤務時間
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            タップすると時間を自動入力します
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing((current) => !current)}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm disabled:opacity-50"
        >
          {isEditing ? "閉じる" : "現在の時間を保存"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <button
              type="button"
              onClick={() =>
                onApply(
                  template.startTime,
                  template.endTime
                )
              }
              disabled={disabled}
              className="px-3 py-2 text-left disabled:opacity-50"
            >
              <span className="block text-xs font-bold text-gray-800">
                {template.label}
              </span>
              <span className="block text-[11px] text-gray-500">
                {template.startTime}〜{template.endTime}
              </span>
            </button>

            {!template.id.startsWith("default-") && (
              <button
                type="button"
                onClick={() => removeTemplate(template.id)}
                disabled={disabled}
                aria-label={`${template.label}を削除`}
                className="border-l border-gray-100 px-2 text-xs font-bold text-red-500 disabled:opacity-50"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-3 rounded-xl bg-white p-3">
          <label className="text-xs font-bold text-gray-700">
            テンプレート名
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              maxLength={20}
              placeholder="例：早番"
              className="mt-1 w-full rounded-lg border border-gray-300 p-3 text-sm font-normal"
            />
          </label>
          <p className="mt-2 text-xs text-gray-500">
            保存する時間：{startTime}〜{endTime}
          </p>
          <button
            type="button"
            onClick={addCurrentTime}
            disabled={disabled}
            className="mt-3 w-full rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            この時間を保存
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className="mt-3 text-xs text-gray-600"
        >
          {message}
        </p>
      )}
    </section>
  );
}
