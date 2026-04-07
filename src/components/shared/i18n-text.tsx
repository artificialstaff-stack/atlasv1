"use client";

import { useI18n } from "@/i18n/provider";
import type { TranslationParams } from "@/i18n";

export function I18nText({
  translationKey,
  params,
}: {
  translationKey: string;
  params?: TranslationParams;
}) {
  const { t } = useI18n();
  return <>{t(translationKey, params)}</>;
}
