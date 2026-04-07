"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Search,
  FolderOpen,
} from "lucide-react";

interface StorageFile {
  name: string;
  id: string | null;
  created_at: string | null;
  metadata: {
    size?: number;
    mimetype?: string;
  } | null;
}

export default function AdminDocumentsPage() {
  const supabase = createClient();
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<string>("customer-documents");
  const [currentPath, setCurrentPath] = useState<string>("");
  const [folders, setFolders] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(currentPath || undefined, {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      toast.error("Dosyalar yüklenemedi");
      setLoading(false);
      return;
    }

    const fileItems: StorageFile[] = [];
    const folderItems: string[] = [];

    (data ?? []).forEach((item) => {
      if (item.id === null) {
        // Folder
        folderItems.push(item.name);
      } else {
        fileItems.push(item as StorageFile);
      }
    });

    setFiles(fileItems);
    setFolders(folderItems);
    setLoading(false);
  }, [supabase, bucket, currentPath]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchFiles();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [fetchFiles]);

  function navigateToFolder(folderName: string) {
    setCurrentPath(
      currentPath ? `${currentPath}/${folderName}` : folderName
    );
  }

  function navigateUp() {
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    setCurrentPath(parts.join("/"));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const filePath = currentPath
      ? `${currentPath}/${file.name}`
      : file.name;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: true });

    if (error) {
      toast.error("Dosya yüklenemedi", { description: error.message });
    } else {
      toast.success("Dosya yüklendi");
      fetchFiles();
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDownload(fileName: string) {
    const path = currentPath ? `${currentPath}/${fileName}` : fileName;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    if (data?.publicUrl) {
      window.open(data.publicUrl, "_blank");
    } else {
      // signedURL fallback for private buckets
      const { data: signed, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);

      if (error) {
        toast.error("İndirme bağlantısı oluşturulamadı");
        return;
      }
      window.open(signed.signedUrl, "_blank");
    }
  }

  async function handleDelete(fileName: string) {
    const path = currentPath ? `${currentPath}/${fileName}` : fileName;
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      toast.error("Dosya silinemedi");
      return;
    }
    toast.success("Dosya silindi");
    fetchFiles();
  }

  function formatSize(bytes?: number) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const filteredFiles = files.filter((f) => {
    if (!search) return true;
    return f.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredFolders = folders.filter((f) => {
    if (!search) return true;
    return f.toLowerCase().includes(search.toLowerCase());
  });

  const breadcrumbParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Belgeler</h1>
          <p className="text-muted-foreground">
            Müşteri belgeleri ve admin dosyaları yönetimi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={bucket} onValueChange={(v) => { setBucket(v); setCurrentPath(""); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer-documents">Müşteri Belgeleri</SelectItem>
              <SelectItem value="admin-uploads">Admin Dosyaları</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Yükleniyor..." : "Dosya Yükle"}
              <input
                type="file"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => setCurrentPath("")}
        >
          {bucket === "customer-documents" ? "Müşteri Belgeleri" : "Admin Dosyaları"}
        </Button>
        {breadcrumbParts.map((part, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span className="text-muted-foreground">/</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() =>
                setCurrentPath(breadcrumbParts.slice(0, idx + 1).join("/"))
              }
            >
              {part}
            </Button>
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Dosya veya klasör ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">
              Yükleniyor...
            </p>
          ) : filteredFolders.length > 0 || filteredFiles.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ad</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Boyut</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentPath && (
                  <TableRow
                    className="cursor-pointer hover:bg-muted"
                    onClick={navigateUp}
                  >
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      ← Üst klasör
                    </TableCell>
                  </TableRow>
                )}
                {filteredFolders.map((folder) => (
                  <TableRow
                    key={folder}
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => navigateToFolder(folder)}
                  >
                    <TableCell className="flex items-center gap-2 font-medium text-sm">
                      <FolderOpen className="h-4 w-4 text-yellow-500" />
                      {folder}
                    </TableCell>
                    <TableCell className="text-sm">Klasör</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
                {filteredFiles.map((file) => (
                  <TableRow key={file.name}>
                    <TableCell className="flex items-center gap-2 font-medium text-sm">
                      <FileText className="h-4 w-4 text-blue-500" />
                      {file.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {file.metadata?.mimetype ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSize(file.metadata?.size)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {file.created_at
                        ? formatDateTime(file.created_at)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7"
                          onClick={() => handleDownload(file.name)}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-destructive"
                          onClick={() => handleDelete(file.name)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12">
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title="Dosya bulunamadı"
                description="Bu dizinde henüz dosya yok."
                action={
                  <Button asChild variant="outline">
                    <label className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Dosya Yükle
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleUpload}
                      />
                    </label>
                  </Button>
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
