import { Globe } from "lucide-react";
import Link from "next/link";

/**
 * Auth Layout — Premium ambient design
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 gradient-mesh" />

      {/* Floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="orb orb-blue w-[400px] h-[400px] -top-32 -right-20 opacity-30" />
        <div className="orb orb-purple w-[350px] h-[350px] -bottom-20 -left-20 opacity-25" />
        <div className="orb orb-teal w-[200px] h-[200px] top-1/3 right-1/4 opacity-20" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2.5 group"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-lg bg-primary/20 blur-md group-hover:bg-primary/30 transition-colors" />
            <Globe className="relative h-8 w-8 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">ATLAS</span>
        </Link>

        {/* Card */}
        <div className="glass rounded-2xl p-1">
          {children}
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-muted-foreground/50">
          <Link href="/" className="hover:text-muted-foreground transition-colors">
            ← Ana sayfaya dön
          </Link>
        </p>
      </div>
    </div>
  );
}
