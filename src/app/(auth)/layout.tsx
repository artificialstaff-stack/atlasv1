import { Globe } from "lucide-react";
import Link from "next/link";

/**
 * Auth Layout — Minimal forma odaklı tasarım
 * Logo + form + arka plan
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">
      <Link
        href="/"
        className="flex items-center gap-2 mb-8"
      >
        <Globe className="h-8 w-8 text-primary" />
        <span className="text-2xl font-bold tracking-tight">ATLAS</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
