"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormData) {
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      toast.error("Giriş başarısız", {
        description: error.message,
      });
      return;
    }

    toast.success("Giriş başarılı!");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const role = user?.app_metadata?.user_role ?? "customer";

    if (role === "admin" || role === "super_admin") {
      router.push("/admin/dashboard");
    } else {
      router.push("/panel/dashboard");
    }

    router.refresh();
  }

  return (
    <Card className="border-0 bg-transparent shadow-none">
      <CardHeader className="text-center space-y-2 pb-6">
        <CardTitle className="text-2xl font-bold">Giriş Yap</CardTitle>
        <CardDescription className="text-muted-foreground">
          ATLAS platformuna erişmek için giriş yapın
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium text-muted-foreground">
                    E-posta
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="ornek@email.com"
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
                    Şifre
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
              type="submit"
              className="w-full h-11 text-sm font-medium"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Giriş Yap
                </>
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Şifremi Unuttum
              </Link>
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center pb-2">
        <p className="text-sm text-muted-foreground">
          Hesabınız yok mu?{" "}
          <Link href="/contact" className="text-primary hover:underline font-medium">
            Başvuru yapın
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
