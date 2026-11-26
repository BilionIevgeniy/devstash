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
import { PREFERENCES_CARD } from "@/features/editor/components/EditorPreferencesSkeleton";
import { useEditorPreferences } from "@/features/editor/components/EditorPreferencesProvider";

const FONT_SIZE_OPTIONS = FONT_SIZES.map((size) => ({
  value: String(size),
  label: `${size}px`,
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
        <div>
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
        </div>
      )}
    </Field>
  );
}

// Each control is in a box of its own: until hydration Radix renders a hidden
// native control beside it, and the field's `space-y` would give the visible
// one a margin that goes with it, a shift of the whole page below.
//
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
      <div className={PREFERENCES_CARD}>
        <PreferenceSelect
          label={t("fontSize")}
          value={String(preferences.fontSize)}
          options={FONT_SIZE_OPTIONS}
          onChange={(value) => change({ fontSize: Number(value) })}
        />
        <PreferenceSelect
          label={t("tabSize")}
          value={String(preferences.tabSize)}
          options={TAB_SIZES.map((size) => ({
            value: String(size),
            label: t("spaces", { count: size }),
          }))}
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
            <div>
              <Switch
                id={id}
                checked={preferences.wordWrap}
                onCheckedChange={(wordWrap) => change({ wordWrap })}
              />
            </div>
          )}
        </Field>
        <Field label={t("minimap")}>
          {(id) => (
            <div>
              <Switch
                id={id}
                checked={preferences.minimap}
                onCheckedChange={(minimap) => change({ minimap })}
              />
            </div>
          )}
        </Field>
      </div>
    </section>
  );
}
