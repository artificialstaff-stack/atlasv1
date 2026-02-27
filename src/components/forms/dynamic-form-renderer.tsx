"use client";

/**
 * Atlas Dynamic Form Renderer
 * FormDefinition'a göre otomatik olarak form alanlarını render eder
 * Koşullu görünürlük, validasyon ve tüm alan tiplerini destekler
 */

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Send, Clock, FileUp, HelpCircle, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { FormDefinition, FormFieldDefinition, FormSection } from "@/lib/forms/types";

// ─── Schema Builder: FormDefinition → Zod Schema ───

function buildZodSchema(sections: FormSection[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const section of sections) {
    for (const field of section.fields) {
      if (field.type === "heading" || field.type === "separator") continue;

      let schema: z.ZodTypeAny;

      switch (field.type) {
        case "number":
        case "currency":
          schema = z.coerce.number({ error: "Geçerli bir sayı giriniz" });
          if (field.validation?.min !== undefined) schema = (schema as z.ZodNumber).min(field.validation.min);
          if (field.validation?.max !== undefined) schema = (schema as z.ZodNumber).max(field.validation.max);
          if (!field.required) schema = schema.optional().or(z.literal("")).or(z.literal(undefined));
          break;

        case "checkbox":
          schema = z.boolean().optional();
          break;

        case "multi-select":
          schema = field.required
            ? z.array(z.string()).min(1, "En az bir seçenek seçiniz")
            : z.array(z.string()).optional();
          break;

        case "file":
          schema = z.any().optional(); // dosya alanı ayrı handle edilir
          break;

        default: {
          let strSchema = z.string();
          if (field.required) {
            strSchema = strSchema.min(1, `${field.label} zorunludur`);
          }
          if (field.validation?.minLength) {
            strSchema = strSchema.min(field.validation.minLength, `En az ${field.validation.minLength} karakter`);
          }
          if (field.validation?.maxLength) {
            strSchema = strSchema.max(field.validation.maxLength, `En fazla ${field.validation.maxLength} karakter`);
          }
          if (field.validation?.pattern) {
            strSchema = strSchema.regex(new RegExp(field.validation.pattern), field.validation.patternMessage ?? "Geçersiz format");
          }
          if (field.type === "email") {
            strSchema = strSchema.email("Geçerli bir e-posta giriniz");
          }
          schema = field.required ? strSchema : strSchema.optional().or(z.literal(""));
          break;
        }
      }

      shape[field.name] = schema;
    }
  }

  return z.object(shape);
}

// ─── Conditional Visibility Hook ───

function useFieldVisibility(
  field: FormFieldDefinition,
  control: ReturnType<typeof useForm>["control"]
): boolean {
  const watchField = field.showWhen?.field;
  const watched = useWatch({ control, name: watchField ?? "__noop__", defaultValue: "" });

  if (!field.showWhen) return true;

  const expected = field.showWhen.value;
  if (Array.isArray(expected)) {
    return expected.includes(watched as string);
  }
  return watched === expected;
}

// ─── Single Field Renderer ───

function FormField({
  field,
  control,
  errors,
}: {
  field: FormFieldDefinition;
  control: ReturnType<typeof useForm>["control"];
  errors: Record<string, { message?: string }>;
}) {
  const visible = useFieldVisibility(field, control);

  if (!visible) return null;

  // Section headings & separators
  if (field.type === "heading") {
    return (
      <div className="col-span-2 pt-2">
        <h4 className="text-sm font-semibold">{field.label}</h4>
        {field.placeholder && (
          <p className="text-xs text-muted-foreground">{field.placeholder}</p>
        )}
      </div>
    );
  }
  if (field.type === "separator") {
    return <Separator className="col-span-2 my-2" />;
  }

  const error = errors[field.name];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={cn("space-y-1.5", field.colSpan === 2 ? "col-span-1" : "col-span-2 sm:col-span-2")}
    >
      <div className="flex items-center gap-1.5">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
        {field.helpText && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">{field.helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <Controller
        name={field.name}
        control={control}
        defaultValue={field.defaultValue ?? (field.type === "multi-select" ? [] : "")}
        render={({ field: rhfField }) => {
          switch (field.type) {
            case "textarea":
              return (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  rows={4}
                  {...rhfField}
                  value={typeof rhfField.value === "string" ? rhfField.value : ""}
                  className={cn(error && "border-red-500")}
                />
              );

            case "select":
              return (
                <Select
                  value={typeof rhfField.value === "string" ? rhfField.value : ""}
                  onValueChange={rhfField.onChange}
                >
                  <SelectTrigger className={cn(error && "border-red-500")}>
                    <SelectValue placeholder="Seçiniz..." />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options?.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );

            case "multi-select": {
              const selected: string[] = Array.isArray(rhfField.value) ? rhfField.value : [];
              return (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {field.options?.map((opt) => {
                      const isChecked = selected.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const next = isChecked
                              ? selected.filter((v) => v !== opt.value)
                              : [...selected, opt.value];
                            rhfField.onChange(next);
                          }}
                          className={cn(
                            "inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                            isChecked
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {selected.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">{selected.length} seçildi</p>
                  )}
                </div>
              );
            }

            case "radio":
              return (
                <div className="flex flex-wrap gap-3">
                  {field.options?.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors",
                        rhfField.value === opt.value
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-card border-border text-muted-foreground hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        checked={rhfField.value === opt.value}
                        onChange={() => rhfField.onChange(opt.value)}
                      />
                      <div
                        className={cn(
                          "h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center",
                          rhfField.value === opt.value ? "border-primary" : "border-muted-foreground/40"
                        )}
                      >
                        {rhfField.value === opt.value && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </div>
                      {opt.label}
                    </label>
                  ))}
                </div>
              );

            case "checkbox":
              return (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={field.name}
                    checked={!!rhfField.value}
                    onCheckedChange={rhfField.onChange}
                  />
                  <Label htmlFor={field.name} className="text-sm text-muted-foreground cursor-pointer">
                    {field.placeholder ?? field.label}
                  </Label>
                </div>
              );

            case "file":
              return (
                <div className={cn(
                  "relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5",
                  error ? "border-red-500" : "border-border"
                )}>
                  <FileUp className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Dosya yüklemek için tıklayın veya sürükleyin
                  </p>
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => rhfField.onChange(e.target.files?.[0]?.name ?? "")}
                  />
                  {rhfField.value && typeof rhfField.value === "string" && rhfField.value.length > 0 && (
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      {rhfField.value}
                    </Badge>
                  )}
                </div>
              );

            case "currency":
              return (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    id={field.name}
                    type="number"
                    placeholder={field.placeholder ?? "0.00"}
                    className={cn("pl-7", error && "border-red-500")}
                    {...rhfField}
                    value={rhfField.value === undefined ? "" : String(rhfField.value)}
                  />
                </div>
              );

            default:
              return (
                <Input
                  id={field.name}
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "url" ? "url" : field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  className={cn(error && "border-red-500")}
                  {...rhfField}
                  value={typeof rhfField.value === "string" || typeof rhfField.value === "number" ? rhfField.value : ""}
                />
              );
          }
        }}
      />

      {error?.message && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          {error.message}
        </p>
      )}
    </motion.div>
  );
}

// ─── Main Component ───

interface DynamicFormRendererProps {
  form: FormDefinition;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  isSubmitting?: boolean;
  /** Önceden doldurulmuş değerler (draft restore, copilot fill) */
  defaultValues?: Record<string, unknown>;
}

export function DynamicFormRenderer({
  form: formDef,
  onSubmit,
  isSubmitting = false,
  defaultValues,
}: DynamicFormRendererProps) {
  const schema = useMemo(() => buildZodSchema(formDef.sections), [formDef]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
    mode: "onBlur",
  });

  const handleFormSubmit = useCallback(
    (data: Record<string, unknown>) => {
      onSubmit(data);
    },
    [onSubmit]
  );

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Form Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {formDef.code}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            v{formDef.version}
          </Badge>
          {formDef.estimatedMinutes && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              ~{formDef.estimatedMinutes} dk
            </span>
          )}
        </div>
        {formDef.instructions && (
          <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
            <p className="text-sm text-blue-400/90">{formDef.instructions}</p>
          </div>
        )}
      </div>

      {/* Sections */}
      {formDef.sections.map((section, sIdx) => (
        <motion.div
          key={sIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sIdx * 0.1 }}
          className="space-y-4"
        >
          <div>
            <h3 className="text-base font-semibold">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-muted-foreground">{section.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {section.fields.map((field) => (
                <FormField
                  key={field.name}
                  field={field}
                  control={control}
                  errors={errors as Record<string, { message?: string }>}
                />
              ))}
            </AnimatePresence>
          </div>

          {sIdx < formDef.sections.length - 1 && (
            <Separator className="mt-4" />
          )}
        </motion.div>
      ))}

      {/* Submit */}
      <div className="flex justify-end pt-4 border-t">
        <Button type="submit" size="lg" disabled={isSubmitting} className="min-w-[200px]">
          <Send className="mr-2 h-4 w-4" />
          {isSubmitting ? "Gönderiliyor..." : "Formu Gönder"}
        </Button>
      </div>
    </form>
  );
}
