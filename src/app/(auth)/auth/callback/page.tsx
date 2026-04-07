"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";
import {
  isRecoveryFlow,
  readHashAuthTokens,
  resolvePostAuthDestination,
} from "@/lib/auth/post-auth";

export default function AuthCallbackPage() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function completeAuth() {
      const code = searchParams.get("code");
      const hashTokens = readHashAuthTokens(window.location.hash);
      const authType = searchParams.get("type") ?? hashTokens?.type ?? null;

      if (!code && !hashTokens) {
        if (isActive) {
          setErrorMessage(t("authPages.callback.missingToken"));
        }
        return;
      }

      const error = code
        ? (await supabase.auth.exchangeCodeForSession(code)).error
        : (
          await supabase.auth.setSession({
            access_token: hashTokens!.accessToken,
            refresh_token: hashTokens!.refreshToken,
          })
        ).error;

      if (error) {
        if (isActive) {
          setErrorMessage(error.message);
        }
        return;
      }

      const destination = isRecoveryFlow({
        next: searchParams.get("next"),
        redirect: searchParams.get("redirect"),
        type: authType,
      })
        ? "/reset-password"
        : await resolvePostAuthDestination(
          supabase,
          searchParams.get("redirect") ?? searchParams.get("next"),
        );

      window.location.replace(destination);
    }

    void completeAuth();

    return () => {
      isActive = false;
    };
  }, [searchParams, supabase, t]);

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="space-y-2 text-center pb-6">
        <CardTitle className="text-2xl font-bold">{t("authPages.callback.title")}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {errorMessage ? t("authPages.callback.errorDescription") : t("authPages.callback.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMessage ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">{t("authPages.callback.errorTitle")}</p>
                <p className="leading-6 text-red-100/80">{errorMessage}</p>
              </div>
            </div>
          </div>
        ) : (
          <div
            role="status"
            className="flex min-h-[148px] flex-col items-center justify-center gap-3 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/12 text-primary">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t("authPages.callback.processing")}</p>
              <p className="text-xs text-muted-foreground">{t("authPages.callback.description")}</p>
            </div>
          </div>
        )}
      </CardContent>
      {errorMessage ? (
        <CardFooter className="flex justify-center pb-2">
          <Button asChild variant="outline">
            <Link href="/login">{t("authPages.callback.backToLogin")}</Link>
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
