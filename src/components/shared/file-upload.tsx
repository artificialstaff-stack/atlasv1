"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export interface UploadedFile {
  name: string;
  size: number;
  url: string;
  path: string;
}

interface FileUploadProps {
  bucket: string;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  onUpload?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function FileUpload({
  bucket,
  folder = "",
  accept = ".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp",
  maxSizeMB = 10,
  multiple = false,
  onUpload,
  onError,
  className = "",
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const maxBytes = maxSizeMB * 1024 * 1024;

  const upload = useCallback(
    async (fileList: FileList) => {
      const toUpload = Array.from(fileList);

      // Validate
      for (const f of toUpload) {
        if (f.size > maxBytes) {
          const msg = `${f.name} dosyası ${maxSizeMB}MB limitini aşıyor`;
          setErrorMsg(msg);
          setStatus("error");
          onError?.(msg);
          return;
        }
      }

      setStatus("uploading");
      setProgress(0);
      setErrorMsg("");

      const uploaded: UploadedFile[] = [];

      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        const filePath = folder ? `${folder}/${Date.now()}_${file.name}` : `${Date.now()}_${file.name}`;

        try {
          const res = await fetch("/api/storage/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bucket,
              path: filePath,
              contentType: file.type,
            }),
          });

          if (!res.ok) throw new Error("Upload URL alınamadı");

          const { signedUrl } = (await res.json()) as { signedUrl: string };

          // Upload directly to storage
          const uploadRes = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!uploadRes.ok) throw new Error("Dosya yüklenemedi");

          uploaded.push({
            name: file.name,
            size: file.size,
            url: signedUrl.split("?")[0],
            path: filePath,
          });
        } catch (err) {
          const msg = `${file.name}: ${err instanceof Error ? err.message : "Yükleme hatası"}`;
          setErrorMsg(msg);
          setStatus("error");
          onError?.(msg);
          return;
        }

        setProgress(Math.round(((i + 1) / toUpload.length) * 100));
      }

      setFiles((prev) => [...prev, ...uploaded]);
      setStatus("success");
      onUpload?.(uploaded);
    },
    [bucket, folder, maxBytes, maxSizeMB, onUpload, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
    },
    [upload]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all
          ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border/50 hover:border-primary/50 hover:bg-muted/30"}
          ${status === "error" ? "border-destructive/50 bg-destructive/5" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => e.target.files?.length && upload(e.target.files)}
        />

        {status === "uploading" ? (
          <div className="space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Yükleniyor... {progress}%</p>
            <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : status === "error" ? (
          <div className="space-y-2">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="text-sm text-destructive">{errorMsg}</p>
            <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setStatus("idle"); }}>
              Tekrar Dene
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Dosya sürükleyin veya tıklayın</p>
            <p className="text-xs text-muted-foreground">Maks. {maxSizeMB}MB • {accept}</p>
          </div>
        )}
      </div>

      {/* Uploaded files list */}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm">
              {status === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
