"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/shared/page-header";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerWorkspaceViewModel } from "@/lib/customer-workspace/types";
import { toast } from "sonner";

export function SupportCenterContent({ workspace }: { workspace: CustomerWorkspaceViewModel }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreateThread() {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      toast.error("Baslik ve mesaj zorunlu.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/customer/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Thread olusturulamadi.");
      }

      setSubject("");
      setMessage("");
      toast.success("Request thread olusturuldu", {
        description: "Yeni konu Atlas ekibine iletildi ve requests merkezine eklendi.",
      });
      router.push("/panel/requests");
      router.refresh();
    } catch (error) {
      toast.error("Request acilamadi", {
        description: error instanceof Error ? error.message : "Beklenmeyen hata",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Yeni bir konu açmak, genel soru sormak veya Atlas ekibine operasyon dışı mesaj bırakmak için destek kanalı."
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Genel destek</CardTitle>
            <CardDescription>
              Standart launch akışı dışındaki sorular için genel destek formunu kullanın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Badge variant="outline" className="font-mono">ATL-701</Badge>
            <p className="text-sm leading-6 text-muted-foreground">
              Teknik sorun, hesap değişikliği, özel talep veya genel operasyon sorularını bu kanal üzerinden Atlas ekibine iletebilirsiniz.
            </p>
            <Button asChild className="rounded-2xl">
              <Link href="/panel/support/forms/ATL-701">Genel destek formu aç</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
          <CardHeader>
            <CardTitle>Aktif request hub</CardTitle>
            <CardDescription>
              Launch akışındaki aktif form ve bilgi talepleri ayrı bir merkezde tutulur.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              Şu anda {workspace.requestCount} açık thread bulunuyor. Bunlar Atlas ekibinin sizden beklediği net girdileri içerir.
            </p>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/panel/requests">Requests & Forms</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.55rem] border-white/8 bg-card/85">
        <CardHeader>
          <CardTitle>Yeni request thread ac</CardTitle>
          <CardDescription>
            Serbest mesaj, ek bilgi veya ozel talep icin Atlas ekibine dogrudan yeni konu acin.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Konu basligi"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
          <Textarea
            placeholder="Atlas ekibine iletmek istediginiz mesaj"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button className="rounded-2xl" disabled={submitting} onClick={() => void handleCreateThread()}>
              Yeni thread ac
            </Button>
            <Button asChild variant="outline" className="rounded-2xl">
              <Link href="/panel/requests">Acik requestleri gor</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
