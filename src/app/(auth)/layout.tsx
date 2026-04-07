import Link from "next/link";
import { AtlasBrandShell } from "@/components/brand/atlas-brand";
import { I18nText } from "@/components/shared/i18n-text";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

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
        <div className="flex items-start justify-between gap-3">
          <Link href="/" className="min-w-0 flex-1">
            <AtlasBrandShell variant="portal" compact />
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-1">
          {children}
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-muted-foreground/50">
          <Link href="/" className="hover:text-muted-foreground transition-colors">
            ← <I18nText translationKey="common.backHome" />
          </Link>
        </p>
      </div>
    </div>
  );
}
