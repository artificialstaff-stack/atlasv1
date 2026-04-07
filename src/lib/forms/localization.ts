import type { Locale } from "@/i18n";

import type { FormCategoryMeta, FormDefinition, FormFieldDefinition, FormSection } from "./types";

type FormLocale = Locale;
export type LocalizedText = string | { tr: string; en: string };

export interface LocalizedOption {
  value: string;
  label: LocalizedText;
}

export interface LocalizedFormFieldDefinition
  extends Omit<FormFieldDefinition, "label" | "placeholder" | "helpText" | "options" | "validation"> {
  label: LocalizedText;
  placeholder?: LocalizedText;
  helpText?: LocalizedText;
  options?: LocalizedOption[];
  validation?: Omit<NonNullable<FormFieldDefinition["validation"]>, "patternMessage"> & {
    patternMessage?: LocalizedText;
  };
}

export interface LocalizedFormSection extends Omit<FormSection, "title" | "description" | "fields"> {
  title: LocalizedText;
  description?: LocalizedText;
  fields: LocalizedFormFieldDefinition[];
}

export interface LocalizedFormDefinition
  extends Omit<FormDefinition, "title" | "description" | "instructions" | "sections"> {
  title: LocalizedText;
  description: LocalizedText;
  instructions?: LocalizedText;
  sections: LocalizedFormSection[];
}

export interface LocalizedFormCategoryMeta extends Omit<FormCategoryMeta, "label" | "description"> {
  label: LocalizedText;
  description: LocalizedText;
}

export interface LocalizedTaskTemplate {
  task_name: LocalizedText;
  task_category: "legal" | "tax" | "customs" | "logistics" | "marketplace" | "other";
  sort_order: number;
  notes_template: LocalizedText;
}

export function localized(tr: string, en: string): LocalizedText {
  return { tr, en };
}

export function resolveLocalizedText(locale: FormLocale, value?: LocalizedText): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "string") return value;
  return value[locale] ?? value.tr ?? value.en;
}

export function resolveLocalizedOptions(locale: FormLocale, options?: LocalizedOption[]) {
  return options?.map((option) => ({
    value: option.value,
    label: resolveLocalizedText(locale, option.label) ?? option.value,
  }));
}

export function resolveLocalizedField(locale: FormLocale, field: LocalizedFormFieldDefinition): FormFieldDefinition {
  return {
    ...field,
    label: resolveLocalizedText(locale, field.label) ?? field.name,
    placeholder: resolveLocalizedText(locale, field.placeholder),
    helpText: resolveLocalizedText(locale, field.helpText),
    options: resolveLocalizedOptions(locale, field.options),
    validation: field.validation
      ? {
          ...field.validation,
          patternMessage: resolveLocalizedText(locale, field.validation.patternMessage),
        }
      : undefined,
  };
}

export function resolveLocalizedSection(locale: FormLocale, section: LocalizedFormSection): FormSection {
  return {
    title: resolveLocalizedText(locale, section.title) ?? "",
    description: resolveLocalizedText(locale, section.description),
    fields: section.fields.map((field) => resolveLocalizedField(locale, field)),
  };
}

export function resolveLocalizedForm(locale: FormLocale, form: LocalizedFormDefinition): FormDefinition {
  return {
    code: form.code,
    title: resolveLocalizedText(locale, form.title) ?? form.code,
    description: resolveLocalizedText(locale, form.description) ?? "",
    instructions: resolveLocalizedText(locale, form.instructions),
    category: form.category,
    estimatedMinutes: form.estimatedMinutes,
    sections: form.sections.map((section) => resolveLocalizedSection(locale, section)),
    active: form.active,
    version: form.version,
  };
}

export function resolveLocalizedCategory(locale: FormLocale, category: LocalizedFormCategoryMeta): FormCategoryMeta {
  return {
    ...category,
    label: resolveLocalizedText(locale, category.label) ?? category.id,
    description: resolveLocalizedText(locale, category.description) ?? "",
  };
}

export function resolveLocalizedTaskTemplate(locale: FormLocale, template: LocalizedTaskTemplate) {
  return {
    ...template,
    task_name: resolveLocalizedText(locale, template.task_name) ?? "",
    notes_template: resolveLocalizedText(locale, template.notes_template) ?? "",
  };
}

export function resolveLocalizedSearchBlob(locale: FormLocale, form: LocalizedFormDefinition): string {
  const parts = [
    resolveLocalizedText(locale, form.code),
    resolveLocalizedText(locale, form.title),
    resolveLocalizedText(locale, form.description),
    resolveLocalizedText(locale, form.instructions),
    ...form.sections.flatMap((section) => [
      resolveLocalizedText(locale, section.title),
      resolveLocalizedText(locale, section.description),
      ...section.fields.flatMap((field) => [
        resolveLocalizedText(locale, field.label),
        resolveLocalizedText(locale, field.placeholder),
        resolveLocalizedText(locale, field.helpText),
        ...(field.options?.map((option) => resolveLocalizedText(locale, option.label) ?? option.value) ?? []),
      ]),
    ]),
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}
