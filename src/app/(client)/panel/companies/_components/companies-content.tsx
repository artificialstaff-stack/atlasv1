"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, CreditCard, FileText } from "lucide-react";

interface Company {
  id: string;
  company_name: string;
  company_type: string;
  state_of_formation: string;
  ein_number: string | null;
  formation_date: string | null;
  status: string;
  registered_agent_name: string | null;
  bank_name: string | null;
  bank_account_status: string | null;
  business_city: string | null;
  business_state: string | null;
  company_email: string | null;
  company_phone: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Beklemede",
  formation_in_progress: "Kuruluyor",
  active: "Aktif",
  suspended: "Askıda",
  dissolved: "Kapatıldı",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  formation_in_progress: "secondary",
  active: "default",
  suspended: "destructive",
  dissolved: "destructive",
};

const COMPANY_TYPES: Record<string, string> = {
  llc: "LLC",
  corporation: "Corporation",
  sole_proprietorship: "Sole Proprietorship",
  partnership: "Partnership",
  other: "Diğer",
};

const BANK_STATUS: Record<string, string> = {
  not_opened: "Açılmadı",
  pending: "Beklemede",
  active: "Aktif",
  closed: "Kapatıldı",
};

export function CompaniesContent({ companies }: { companies: Company[] }) {
  if (companies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Şirketlerim</h1>
          <p className="text-muted-foreground">ABD&apos;deki LLC ve şirket bilgileriniz</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold">Henüz şirket kaydı yok</h3>
            <p className="text-sm text-muted-foreground mt-1">
              LLC kuruluş süreciniz başladığında burada görünecektir.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCount = companies.filter((c) => c.status === "active").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Şirketlerim</h1>
        <p className="text-muted-foreground">ABD&apos;deki LLC ve şirket bilgileriniz</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{companies.length}</div>
            <p className="text-xs text-muted-foreground">Toplam Şirket</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Aktif</p>
          </CardContent>
        </Card>
      </div>

      {/* Company Cards */}
      <div className="grid gap-4">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {company.company_name}
                  </CardTitle>
                  <CardDescription>
                    {COMPANY_TYPES[company.company_type] || company.company_type}
                    {company.state_of_formation && ` • ${company.state_of_formation}`}
                  </CardDescription>
                </div>
                <Badge variant={STATUS_COLORS[company.status] || "outline"}>
                  {STATUS_LABELS[company.status] || company.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {company.ein_number && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">EIN:</span>
                    <span className="font-medium">{company.ein_number}</span>
                  </div>
                )}
                {company.formation_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Kuruluş:</span>
                    <span className="font-medium">
                      {new Date(company.formation_date).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                )}
                {company.business_state && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Lokasyon:</span>
                    <span className="font-medium">
                      {company.business_city && `${company.business_city}, `}
                      {company.business_state}
                    </span>
                  </div>
                )}
                {company.bank_name && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Banka:</span>
                    <span className="font-medium">
                      {company.bank_name}
                      {company.bank_account_status &&
                        ` (${BANK_STATUS[company.bank_account_status] || company.bank_account_status})`}
                    </span>
                  </div>
                )}
                {company.registered_agent_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Registered Agent:</span>
                    <span className="font-medium">{company.registered_agent_name}</span>
                  </div>
                )}
              </div>
              {company.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                  {company.notes}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
