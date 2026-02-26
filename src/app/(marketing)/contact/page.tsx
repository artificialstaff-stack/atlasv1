"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır"),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company_name: "",
      message: "",
    },
  });

  async function onSubmit(data: ContactFormData) {
    try {
      // Server Action veya API Route ile gönderilecek
      // Şimdilik başarılı varsayıyoruz
      toast.success("Başvurunuz alındı!", {
        description: "En kısa sürede sizinle iletişime geçeceğiz.",
      });
      form.reset();
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-3 mb-12">
          <h1 className="text-4xl font-bold tracking-tight">İletişim</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            ABD pazarına açılmak için ilk adımı atın. Uzman ekibimiz sizinle
            iletişime geçsin.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {/* İletişim Bilgileri */}
          <div className="space-y-6">
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <Mail className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">E-posta</p>
                  <p className="text-sm text-muted-foreground">
                    info@atlas-platform.com
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <Phone className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Telefon</p>
                  <p className="text-sm text-muted-foreground">
                    +1 (703) 555-0123
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start gap-3 pt-6">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Adres</p>
                  <p className="text-sm text-muted-foreground">
                    Virginia, DMV Bölgesi, ABD
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Başvuru Formu</CardTitle>
              <CardDescription>
                Bilgilerinizi doldurun, ekibimiz 24 saat içinde sizinle
                iletişime geçsin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ad Soyad *</FormLabel>
                          <FormControl>
                            <Input placeholder="Adınız Soyadınız" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>E-posta *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="ornek@email.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefon</FormLabel>
                          <FormControl>
                            <Input placeholder="+90 5XX XXX XX XX" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Şirket Adı</FormLabel>
                          <FormControl>
                            <Input placeholder="Şirketinizin adı" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mesajınız *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="ABD pazarına giriş planlarınız hakkında bize bilgi verin..."
                            rows={5}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={form.formState.isSubmitting}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting
                      ? "Gönderiliyor..."
                      : "Başvuru Gönder"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
