"use client";
import { useTranslations } from "next-intl";

import { Code } from "lucide-react";

import { Field } from "@/components/common/Field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { EDITOR_THEME_LABELS } from "@/features/editor/_internal/domain/editor-themes";
import {
  EDITOR_THEMES,
  FONT_SIZES,
  TAB_SIZES,
  type EditorPreferences,
  type EditorThemeName,
} from "@/features/editor/_internal/domain/preferences";
import { useEditorPreferences } from "@/features/editor/components/EditorPreferencesProvider";

const FONT_SIZE_OPTIONS = FONT_SIZES.map((size) => ({
  value: String(size),
  label: `${size}px`,
}));
const TAB_SIZE_OPTIONS = TAB_SIZES.map((size) => ({
  value: String(size),
  label: `${size} spaces`,
}));
const THEME_OPTIONS = EDITOR_THEMES.map((theme) => ({
  value: theme,
  label: EDITOR_THEME_LABELS[theme],
}));

interface PreferenceSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function PreferenceSelect({
  label,
  value,
  options,
  onChange,
}: PreferenceSelectProps) {
  return (
    <Field label={label}>
      {(id) => (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </Field>
  );
}

// Controls stay enabled during a save: the value changes at once, and disabling
// a focused control would drop the keyboard focus.
export function EditorPreferencesSection() {
  const t = useTranslations("editor");
  const { preferences, update } = useEditorPreferences();

  function change(fields: Partial<EditorPreferences>) {
    update({ ...preferences, ...fields });
  }

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Code className="size-4 text-muted-foreground" />
        {t("title")}
      </h2>
      <div className="grid gap-6 rounded-lg border bg-card p-6 sm:grid-cols-2">
        <PreferenceSelect
          label={t("fontSize")}
          value={String(preferences.fontSize)}
          options={FONT_SIZE_OPTIONS}
          onChange={(value) => change({ fontSize: Number(value) })}
        />
        <PreferenceSelect
          label={t("tabSize")}
          value={String(preferences.tabSize)}
          options={TAB_SIZE_OPTIONS}
          onChange={(value) => change({ tabSize: Number(value) })}
        />
        <PreferenceSelect
          label={t("theme")}
          value={preferences.theme}
          options={THEME_OPTIONS}
          onChange={(value) => change({ theme: value as EditorThemeName })}
        />
        <Field label={t("wordWrap")}>
          {(id) => (
            <Switch
              id={id}
              checked={preferences.wordWrap}
              onCheckedChange={(wordWrap) => change({ wordWrap })}
            />
          )}
        </Field>
        <Field label={t("minimap")}>
          {(id) => (
            <Switch
              id={id}
              checked={preferences.minimap}
              onCheckedChange={(minimap) => change({ minimap })}
            />
          )}
        </Field>
      </div>
    </section>
  );
}
