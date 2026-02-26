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
import { Mail, Phone, MapPin, Send, Clock, MessageSquare, Loader2, Globe, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const contactSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalıdır"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const contactInfo = [
  {
    icon: Mail,
    title: "E-posta",
    value: "info@atlas-platform.com",
    description: "7/24 e-posta desteği",
    gradient: "from-primary/20 to-primary/5",
  },
  {
    icon: Phone,
    title: "Telefon",
    value: "+1 (703) 555-0123",
    description: "Hafta içi 09:00 - 18:00 EST",
    gradient: "from-secondary/20 to-secondary/5",
  },
  {
    icon: MapPin,
    title: "Adres",
    value: "Virginia, DMV Bölgesi",
    description: "Amerika Birleşik Devletleri",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: Clock,
    title: "Yanıt Süresi",
    value: "24 saat içinde",
    description: "Ortalama 4 saatte dönüş",
    gradient: "from-primary/20 to-accent/5",
  },
];

function AnimatedSection({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

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
      void data;
      toast.success("Başvurunuz alındı!", {
        description: "En kısa sürede sizinle iletişime geçeceğiz.",
      });
      form.reset();
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-mesh opacity-30" />
      <div className="orb orb-blue w-[500px] h-[500px] -top-40 -right-40" />
      <div className="orb orb-purple w-[400px] h-[400px] bottom-20 -left-32" />

      {/* Hero Section */}
      <section className="relative py-20 md:py-28">
        <div className="container mx-auto px-4 md:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground mb-6"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Bizimle iletişime geçin
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              ABD Pazarına{" "}
              <span className="text-gradient">İlk Adımı</span>{" "}
              Birlikte Atalım
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Uzman ekibimiz işletmenizin ABD&apos;ye açılma sürecini baştan sona yönetir.
              Formu doldurun, 24 saat içinde sizinle iletişime geçelim.
            </p>
          </motion.div>

          {/* Contact Info Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-20">
            {contactInfo.map((info, i) => (
              <AnimatedSection key={info.title} delay={0.1 * i}>
                <div className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-5 text-center hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                  <div className={`mx-auto mb-3 h-12 w-12 rounded-xl bg-gradient-to-br ${info.gradient} flex items-center justify-center`}>
                    <info.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm mb-0.5">{info.title}</p>
                  <p className="text-sm text-foreground/80 mb-1">{info.value}</p>
                  <p className="text-xs text-muted-foreground">{info.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Main Form Area */}
          <div className="grid gap-10 lg:grid-cols-5 max-w-6xl mx-auto">
            {/* Left Side — Why Atlas */}
            <AnimatedSection className="lg:col-span-2 space-y-8" delay={0.1}>
              <div>
                <h2 className="text-2xl font-bold mb-4">Neden Atlas?</h2>
                <p className="text-muted-foreground leading-relaxed mb-6">
                  Türk işletmelerinin Amerika pazarına güvenle girmesini sağlayan
                  uçtan uca çözüm platformu.
                </p>
              </div>

              <div className="space-y-5">
                {[
                  {
                    icon: Globe,
                    title: "ABD Merkezli Operasyon",
                    desc: "Virginia merkezli ekibimiz ile yerel destek",
                  },
                  {
                    icon: Clock,
                    title: "Hızlı Başlangıç",
                    desc: "30 gün içinde ABD pazarında aktif olun",
                  },
                  {
                    icon: MessageSquare,
                    title: "Kişisel Danışman",
                    desc: "Her müşteriye özel iş geliştirme uzmanı",
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 group">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <item.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm mb-0.5">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 to-secondary/5 p-5">
                <p className="text-sm font-medium mb-2">Hızlı Görüşme</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Formu doldurmak yerine direkt görüşmek mi istiyorsunuz?
                </p>
                <Button variant="outline" size="sm" className="group">
                  +1 (703) 555-0123
                  <ArrowRight className="ml-2 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </div>
            </AnimatedSection>

            {/* Right Side — Form */}
            <AnimatedSection className="lg:col-span-3" delay={0.2}>
              <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-xl shadow-black/5">
                {/* Form glow */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">Başvuru Formu</h3>
                    <p className="text-sm text-muted-foreground">
                      Bilgilerinizi doldurun, ekibimiz 24 saat içinde sizinle iletişime geçsin.
                    </p>
                  </div>

                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="space-y-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ad Soyad *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Adınız Soyadınız"
                                  className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                                  {...field}
                                />
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
                                  className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
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
                                <Input
                                  placeholder="+90 5XX XXX XX XX"
                                  className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                                  {...field}
                                />
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
                                <Input
                                  placeholder="Şirketinizin adı"
                                  className="bg-muted/50 border-border/50 focus:bg-background transition-colors"
                                  {...field}
                                />
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
                                className="bg-muted/50 border-border/50 focus:bg-background transition-colors resize-none"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        size="lg"
                        className="w-full"
                        disabled={form.formState.isSubmitting}
                      >
                        {form.formState.isSubmitting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Gönderiliyor...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Başvuru Gönder
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Bilgileriniz gizlilik politikamız kapsamında korunmaktadır.
                      </p>
                    </form>
                  </Form>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </div>
  );
}
