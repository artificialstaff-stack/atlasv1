"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  TestTube,
  Trash2,
  Zap,
  Brain,
} from "lucide-react";
import type { ProviderHealthSummary, ProviderOpinion } from "@/lib/ai/provider-types";
import type { BrainProviderReport } from "@/lib/jarvis/brain-opinions";

interface ProviderReport {
  report: BrainProviderReport;
}

export default function ProvidersPage() {
  const [report, setReport] = useState<BrainProviderReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New provider form state
  const [showForm, setShowForm] = useState(false);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formBaseURL, setFormBaseURL] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formPriority, setFormPriority] = useState("50");
  const [formSaving, setFormSaving] = useState(false);

  // Test connection state
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs?: number; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/copilot/jarvis/providers");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ProviderReport = await res.json();
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleTestConnection = async () => {
    if (!formBaseURL || !formModel) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/copilot/jarvis/providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseURL: formBaseURL, apiKey: formApiKey, model: formModel }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Bağlantı hatası" });
    } finally {
      setTesting(false);
    }
  };

  const handleAddProvider = async () => {
    if (!formId || !formName || !formBaseURL) return;
    setFormSaving(true);
    try {
      const res = await fetch("/api/admin/copilot/jarvis/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: formId,
          name: formName,
          baseURL: formBaseURL,
          apiKey: formApiKey,
          models: formModel ? { primary: formModel } : {},
          priority: Number(formPriority) || 50,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setShowForm(false);
      resetForm();
      fetchReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Eklenemedi");
    } finally {
      setFormSaving(false);
    }
  };

  const handleRemoveProvider = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/copilot/jarvis/providers?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Silinemedi");
    }
  };

  const handleToggleProvider = async (id: string, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/admin/copilot/jarvis/providers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      fetchReport();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Güncellenemedi");
    }
  };

  const resetForm = () => {
    setFormId("");
    setFormName("");
    setFormBaseURL("");
    setFormApiKey("");
    setFormModel("");
    setFormPriority("50");
    setTestResult(null);
  };

  const providers = report?.providers ?? [];
  const available = providers.filter((p) => p.enabled && p.isAvailable && !p.isRateLimited);
  const rateLimited = providers.filter((p) => p.isRateLimited);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">LLM Provider Yönetimi</h1>
          <p className="text-muted-foreground">
            Jarvis beynine bağlı tüm yapay zeka API&apos;lerini yönetin.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Yenile
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-2 h-4 w-4" />
            Provider Ekle
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Provider</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{available.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rate Limited</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{rateLimited.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam İstek</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.reduce((sum, p) => sum + p.requestCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Provider Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Yeni Provider Ekle</CardTitle>
            <CardDescription>
              OpenAI-uyumlu herhangi bir LLM API&apos;si ekleyebilirsiniz.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">ID</label>
                <Input
                  placeholder="openai, anthropic, groq..."
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">İsim</label>
                <Input
                  placeholder="OpenAI GPT-4o"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  placeholder="https://api.openai.com/v1"
                  value={formBaseURL}
                  onChange={(e) => setFormBaseURL(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Primary Model</label>
                <Input
                  placeholder="gpt-4o, llama-3.3-70b-versatile..."
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Öncelik (düşük = daha tercihli)</label>
                <Input
                  type="number"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                />
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`rounded-md p-3 text-sm ${testResult.success ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                {testResult.success
                  ? `✅ Bağlantı başarılı — ${testResult.latencyMs}ms`
                  : `❌ ${testResult.error}`}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testing || !formBaseURL || !formModel}
              >
                <TestTube className={`mr-2 h-4 w-4 ${testing ? "animate-spin" : ""}`} />
                Bağlantı Test Et
              </Button>
              <Button
                onClick={handleAddProvider}
                disabled={formSaving || !formId || !formName || !formBaseURL}
              >
                {formSaving ? "Ekleniyor..." : "Kaydet"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Provider Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !report ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Henüz kayıtlı provider yok. Env var&apos;lardan bootstrap edilmemiş olabilir.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Öncelik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>İstek</TableHead>
                  <TableHead>Hata</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {p.isHqtt && <Brain className="h-4 w-4 text-purple-500" />}
                        <div>
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">{p.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{p.priority}</TableCell>
                    <TableCell>
                      {!p.enabled ? (
                        <Badge variant="secondary">Devre Dışı</Badge>
                      ) : p.isRateLimited ? (
                        <Badge variant="destructive">
                          <Clock className="mr-1 h-3 w-3" />
                          Rate Limited
                        </Badge>
                      ) : !p.isAvailable ? (
                        <Badge variant="destructive">Erişilemez</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Aktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.requestCount > 0 ? `${Math.round(p.averageLatencyMs)}ms` : "—"}
                    </TableCell>
                    <TableCell>{p.requestCount}</TableCell>
                    <TableCell>
                      {p.consecutiveErrors > 0 ? (
                        <span className="text-red-500">{p.consecutiveErrors}×</span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleProvider(p.id, p.enabled)}
                        >
                          {p.enabled ? "Durdur" : "Başlat"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveProvider(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Brain Summary */}
      {report && (report.summary.length > 0 || report.recommendations.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Beyin Değerlendirmesi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.summary.map((s, i) => (
              <p key={i} className="text-sm">{s}</p>
            ))}
            {report.recommendations.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-semibold text-yellow-600">Öneriler:</h4>
                {report.recommendations.map((r, i) => (
                  <p key={i} className="text-sm text-muted-foreground">• {r}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Brain Opinions per Slot */}
      {report && report.opinions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Slot Bazlı Tercihler</CardTitle>
            <CardDescription>
              Beynin her slot için öğrendiği provider tercihleri (en az 3 örnek sonrası).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Skor</TableHead>
                  <TableHead>Örnek</TableHead>
                  <TableHead>Neden</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.opinions.map((o, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{o.slot}</TableCell>
                    <TableCell>{o.providerId}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className="h-2 rounded-full bg-purple-500"
                            style={{ width: `${o.preferenceScore * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(o.preferenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{o.sampleCount}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
