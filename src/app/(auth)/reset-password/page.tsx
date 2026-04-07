"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import { readHashAuthTokens, resolvePostAuthDestination } from "@/lib/auth/post-auth";

export default function ResetPasswordPage() {
  const supabase = useMemo(() => createClient(), []);
  const { t } = useI18n();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accessReady, setAccessReady] = useState(false);

  const schema = useMemo(
    () =>
      z.object({
        password: z.string().min(8, t("authPages.resetPassword.shortPassword")),
        confirmPassword: z.string().min(8, t("authPages.resetPassword.shortPassword")),
      }).refine((data) => data.password === data.confirmPassword, {
        path: ["confirmPassword"],
        message: t("authPages.resetPassword.passwordMismatch"),
      }),
    [t],
  );

  type FormData = z.infer<typeof schema>;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    let isActive = true;

    async function ensureRecoverySession() {
      const hashTokens = readHashAuthTokens(window.location.hash);
      if (hashTokens) {
        const { error } = await supabase.auth.setSession({
          access_token: hashTokens.accessToken,
          refresh_token: hashTokens.refreshToken,
        });

        if (error) {
          toast.error(t("authPages.resetPassword.error"), {
            description: error.message,
          });
          window.location.replace("/forgot-password");
          return;
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error(t("authPages.resetPassword.invalidSession"));
        window.location.replace("/forgot-password");
        return;
      }

      if (isActive) {
        setAccessReady(true);
      }
    }

    void ensureRecoverySession();

    return () => {
      isActive = false;
    };
  }, [supabase, t]);

  async function onSubmit(values: FormData) {
    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (error) {
      toast.error(t("authPages.resetPassword.error"), {
        description: error.message,
      });
      return;
    }

    toast.success(t("authPages.resetPassword.success"));
    const destination = await resolvePostAuthDestination(supabase);
    window.location.replace(destination);
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="text-center space-y-2 pb-6">
        <CardTitle className="text-2xl font-bold">{t("authPages.resetPassword.title")}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("authPages.resetPassword.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!accessReady ? (
          <div
            role="status"
            className="flex min-h-[148px] flex-col items-center justify-center gap-3 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm text-muted-foreground">{t("authPages.callback.processing")}</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      {t("authPages.resetPassword.password")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pr-10 bg-muted/50 border-border/50 focus:bg-background transition-colors"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">
                      {t("authPages.resetPassword.confirmPassword")}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 pr-10 bg-muted/50 border-border/50 focus:bg-background transition-colors"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 text-sm font-medium" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("authPages.resetPassword.submitting")}
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    {t("authPages.resetPassword.submit")}
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center pb-2">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("authPages.resetPassword.backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  );
}
