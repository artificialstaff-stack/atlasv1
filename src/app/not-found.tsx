import Link from "next/link";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl w-32 h-32 -top-4 -left-4" />
        <Globe className="relative h-16 w-16 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-7xl font-bold tracking-tighter text-gradient">
          404
        </h1>
        <h2 className="text-xl font-semibold">Sayfa Bulunamadı</h2>
        <p className="text-muted-foreground max-w-md">
          Aradığınız sayfa taşınmış, silinmiş veya hiç var olmamış olabilir.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/">Ana Sayfa</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/contact">İletişim</Link>
        </Button>
      </div>
    </div>
  );
}
