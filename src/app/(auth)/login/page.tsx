"use client";

import { useEffect, useMemo, useState, type BaseSyntheticEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LogIn, Eye, EyeOff, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { getUserLocale, persistLocaleCookie } from "@/lib/locale";
import {
  DEFAULT_CUSTOMER_REDIRECT,
  isRecoveryFlow,
  normalizeRedirectTarget,
  readHashAuthTokens,
  resolvePostAuthDestination,
} from "@/lib/auth/post-auth";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const { t, setLocale } = useI18n();
  const redirectTarget = normalizeRedirectTarget(searchParams.get("redirect")) ?? DEFAULT_CUSTOMER_REDIRECT;

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("authPages.login.invalidEmail")),
        password: z.string().min(6, t("authPages.login.shortPassword")),
      }),
    [t],
  );

  type LoginFormData = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function applyPreferredLocale() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const preferredLocale = getUserLocale(user);
    if (preferredLocale) {
      setLocale(preferredLocale);
      persistLocaleCookie(preferredLocale);
    }
  }

  useEffect(() => {
    const hashTokens = readHashAuthTokens(window.location.hash);
    if (!hashTokens) {
      return;
    }
    const sessionTokens = hashTokens;

    let isActive = true;

    async function restoreSession() {
      setIsRestoringSession(true);

      const { error } = await supabase.auth.setSession({
        access_token: sessionTokens.accessToken,
        refresh_token: sessionTokens.refreshToken,
      });

      if (error) {
        if (isActive) {
          setIsRestoringSession(false);
          toast.error(t("authPages.callback.errorTitle"), {
            description: error.message,
          });
        }
        return;
      }

      await applyPreferredLocale();
      const destination = isRecoveryFlow({
        next: searchParams.get("next"),
        redirect: searchParams.get("redirect"),
        type: sessionTokens.type,
      })
        ? "/reset-password"
        : await resolvePostAuthDestination(supabase, searchParams.get("redirect"));

      window.location.replace(destination);
    }

    void restoreSession();

    return () => {
      isActive = false;
    };
  }, [searchParams, setLocale, supabase, t]);

  async function onSubmit(data: LoginFormData) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error(t("authPages.login.failure"), {
        description: error.message,
      });
      return;
    }

    await applyPreferredLocale();
    toast.success(t("authPages.login.success"));
    const destination = isRecoveryFlow({
      next: searchParams.get("next"),
      redirect: searchParams.get("redirect"),
    })
      ? "/reset-password"
      : await resolvePostAuthDestination(supabase, redirectTarget);
    window.location.replace(destination);
  }

  function handleSubmit(event?: BaseSyntheticEvent) {
    if (event?.preventDefault) {
      event.preventDefault();
    }

    void form.handleSubmit(onSubmit)(event);
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="text-center space-y-2 pb-6">
        <CardTitle className="text-2xl font-bold">{t("authPages.login.title")}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {t("authPages.login.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            method="post"
            noValidate
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t("authPages.login.email")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t("authPages.login.emailPlaceholder")}
                      className="h-11 bg-muted/50 border-border/50 focus:bg-background transition-colors"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    {t("authPages.login.password")}
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
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              className="w-full h-11 text-sm font-medium"
              disabled={form.formState.isSubmitting || isRestoringSession}
              onClick={() => {
                void form.handleSubmit(onSubmit)();
              }}
            >
              {form.formState.isSubmitting || isRestoringSession ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRestoringSession ? t("authPages.callback.processing") : t("authPages.login.submitting")}
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  {t("authPages.login.submit")}
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {t("authPages.login.forgotPassword")}
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center pb-2">
        <p className="text-sm text-muted-foreground">
          {t("authPages.login.noAccount")}{" "}
          <Link href="/contact" className="text-primary hover:underline font-medium">
            {t("authPages.login.apply")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
