"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/provider";

type InviteState = "checking" | "missing" | "valid" | "invalid";

function ApplicationGate() {
  const { t } = useI18n();

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div>
          <CardTitle className="text-2xl">{t("authPages.register.applicationGate.title")}</CardTitle>
          <CardDescription className="mt-3 text-sm leading-6 text-muted-foreground">
            {t("authPages.register.applicationGate.description")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-border/50 bg-muted/30 p-4">
          <p className="text-sm font-medium">{t("authPages.register.applicationGate.stepsTitle")}</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <p>{t("authPages.register.applicationGate.step1")}</p>
            <p>{t("authPages.register.applicationGate.step2")}</p>
            <p>{t("authPages.register.applicationGate.step3")}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild className="w-full">
            <Link href="/contact?intent=application">
              {t("authPages.register.applicationGate.primaryCta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/pricing">{t("authPages.register.applicationGate.secondaryCta")}</Link>
          </Button>
        </div>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {t("authPages.register.applicationGate.hint")}
        </p>
      </CardFooter>
    </Card>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const supabase = createClient();
  const [inviteState, setInviteState] = useState<InviteState>("checking");
  const [inviteEmail, setInviteEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { t } = useI18n();

  const registerSchema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t("authPages.register.invalidEmail")),
          password: z.string().min(8, t("authPages.register.shortPassword")),
          confirmPassword: z.string(),
          firstName: z.string().min(2, t("authPages.register.shortFirstName")),
          lastName: z.string().min(2, t("authPages.register.shortLastName")),
          companyName: z.string().min(2, t("authPages.register.requiredCompany")),
          phone: z.string().optional(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("authPages.register.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  type RegisterFormData = z.infer<typeof registerSchema>;

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      companyName: "",
      phone: "",
    },
  });

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setInviteState("missing");
        return;
      }

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("token", token)
        .eq("status", "pending")
        .single();

      if (error || !data) {
        setInviteState("invalid");
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setInviteState("invalid");
        return;
      }

      setInviteState("valid");
      setInviteEmail(data.email);
      form.setValue("email", data.email);
    }

    verifyToken();
  }, [form, supabase, token]);

  async function onSubmit(data: RegisterFormData) {
    if (!token || inviteState !== "valid") return;

    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          company_name: data.companyName,
        },
      },
    });

    if (authError) {
      toast.error(t("authPages.login.failure"), { description: authError.message });
      return;
    }

    await supabase.from("invitations").update({ status: "accepted" }).eq("token", token);

    toast.success(t("authPages.register.success"), {
      description: t("authPages.register.successDescription"),
    });

    router.push("/login");
  }

  if (inviteState === "missing") {
    return <ApplicationGate />;
  }

  if (inviteState === "invalid") {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="text-xl font-semibold">{t("authPages.register.invalidInviteTitle")}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("authPages.register.invalidInviteDescription")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link href="/contact?intent=application">{t("authPages.register.applicationGate.primaryCta")}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">{t("authPages.register.home")}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inviteState === "checking") {
    return (
      <Card className="border-0 bg-transparent shadow-none">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
            <div className="text-muted-foreground">{t("authPages.register.verifying")}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{t("authPages.register.title")}</CardTitle>
        <CardDescription>{t("authPages.register.invitedAs", { email: inviteEmail })}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("authPages.register.email")}</FormLabel>
                  <FormControl>
                    <Input type="email" disabled className="border-border/50 bg-muted/50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("authPages.register.firstName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("authPages.register.firstNamePlaceholder")} className="border-border/50 bg-muted/50 focus:bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("authPages.register.lastName")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("authPages.register.lastNamePlaceholder")} className="border-border/50 bg-muted/50 focus:bg-background" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("authPages.register.companyName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("authPages.register.companyNamePlaceholder")} className="border-border/50 bg-muted/50 focus:bg-background" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("authPages.register.phone")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("authPages.register.phonePlaceholder")} className="border-border/50 bg-muted/50 focus:bg-background" {...field} />
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
                  <FormLabel>{t("authPages.register.password")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showPassword ? "text" : "password"} placeholder="••••••••" className="border-border/50 bg-muted/50 pr-10 focus:bg-background" {...field} />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
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
                  <FormLabel>{t("authPages.register.confirmPassword")}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type={showConfirm ? "text" : "password"} placeholder="••••••••" className="border-border/50 bg-muted/50 pr-10 focus:bg-background" {...field} />
                      <button type="button" onClick={() => setShowConfirm((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("authPages.register.submitting")}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {t("authPages.register.submit")}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("authPages.register.alreadyHaveAccount")}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("authPages.register.login")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-0 bg-transparent shadow-none">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="mr-3 h-6 w-6 animate-spin text-primary" />
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
