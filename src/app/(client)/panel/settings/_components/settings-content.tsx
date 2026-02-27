"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  User,
  Building2,
  Phone,
  Mail,
  Shield,
  Calendar,
  Lock,
  Save,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/shared/page-header";
import { BentoGrid, BentoCell } from "@/components/shared/bento-grid";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProfileData {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
  phone: string;
  role: string;
  createdAt: string;
}

const profileSchema = z.object({
  fullName: z.string().min(2, "Ad en az 2 karakter olmalıdır"),
  companyName: z.string().min(2, "Şirket adı en az 2 karakter olmalıdır"),
  phone: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, "Mevcut şifre en az 6 karakter"),
    newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalıdır"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const ROLE_LABELS: Record<string, string> = {
  customer: "Müşteri",
  admin: "Yönetici",
  super_admin: "Süper Yönetici",
};

export function SettingsContent({ profile }: { profile: ProfileData }) {
  const supabase = createClient();
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName,
      companyName: profile.companyName,
      phone: profile.phone,
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(data: ProfileFormData) {
    const [firstName, ...lastParts] = data.fullName.trim().split(" ");
    const lastName = lastParts.join(" ") || "";

    const { error } = await supabase
      .from("users")
      .update({
        first_name: firstName,
        last_name: lastName,
        company_name: data.companyName,
        phone: data.phone,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Profil güncellenemedi", { description: error.message });
      return;
    }
    toast.success("Profil güncellendi");
  }

  async function onPasswordSubmit(data: PasswordFormData) {
    // Supabase requires re-auth for password updates
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: data.currentPassword,
    });

    if (signInError) {
      toast.error("Mevcut şifre yanlış");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: data.newPassword,
    });

    if (error) {
      toast.error("Şifre güncellenemedi", { description: error.message });
      return;
    }

    toast.success("Şifre güncellendi");
    passwordForm.reset();
  }

  const memberSince = new Date(profile.createdAt).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ayarlar"
        description="Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin."
      />

      <BentoGrid cols={3}>
        {/* Profile Card — left side, 2 col */}
        <BentoCell span="2" className="p-0">
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Profil Bilgileri
              </CardTitle>
              <CardDescription>
                Hesap bilgilerinizi güncelleyin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form
                  onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Ad Soyad
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Ad Soyad"
                                className="pl-9 h-11 bg-muted/50 border-border/50"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={profileForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Şirket Adı
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Şirket Adı"
                                className="pl-9 h-11 bg-muted/50 border-border/50"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Telefon
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="tel"
                              placeholder="+90 5XX XXX XX XX"
                              className="pl-9 h-11 bg-muted/50 border-border/50"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={profileForm.formState.isSubmitting}
                      className="h-10"
                    >
                      {profileForm.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Kaydet
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </BentoCell>

        {/* Account Info Card — right side, 1 col */}
        <BentoCell className="p-0">
          <Card className="border-0 shadow-none bg-transparent h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4 text-primary" />
                Hesap Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <InfoRow
                  icon={Mail}
                  label="E-posta"
                  value={profile.email}
                />
                <InfoRow
                  icon={Shield}
                  label="Hesap Tipi"
                  value={
                    <Badge variant="secondary" className="text-xs">
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </Badge>
                  }
                />
                <InfoRow
                  icon={Calendar}
                  label="Üyelik Tarihi"
                  value={memberSince}
                />
              </div>

              <Separator />

              {/* Avatar placeholder */}
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                  {profile.fullName
                    ? profile.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : profile.email[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {profile.fullName || "İsimsiz"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {profile.companyName || "Şirket belirtilmemiş"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </BentoCell>
      </BentoGrid>

      {/* Password Change Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4 text-primary" />
              Şifre Değiştir
            </CardTitle>
            <CardDescription>
              Hesap güvenliğiniz için şifrenizi düzenli olarak güncelleyin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4 max-w-lg"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">
                        Mevcut Şifre
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type={showCurrentPw ? "text" : "password"}
                            placeholder="••••••••"
                            className="pl-9 pr-10 h-11 bg-muted/50 border-border/50"
                            {...field}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                          >
                            {showCurrentPw ? (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Yeni Şifre
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type={showNewPw ? "text" : "password"}
                              placeholder="••••••••"
                              className="pl-9 pr-10 h-11 bg-muted/50 border-border/50"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPw(!showNewPw)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                            >
                              {showNewPw ? (
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

                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Şifre Tekrar
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="password"
                              placeholder="••••••••"
                              className="pl-9 h-11 bg-muted/50 border-border/50"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={passwordForm.formState.isSubmitting}
                    className="h-10"
                  >
                    {passwordForm.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Şifreyi Güncelle
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}
