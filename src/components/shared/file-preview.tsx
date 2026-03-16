"use client";

import { useState, useEffect } from "react";
import { X, Download, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilePreviewProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
}

export function FilePreview({ fileId, fileName, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const ext = fileName.toLowerCase().split(".").pop() || "";
  const isImage = ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
  const isPdf = ext === "pdf";
  const isVideo = ["mp4", "mov", "avi"].includes(ext);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/box/files/${fileId}/preview`);
        const data = await res.json();
        setPreviewUrl(data.preview_url || "");
        setDownloadUrl(data.download_url || "");
      } catch (err) {
        console.error("Preview load failed:", err);
      }
      setLoading(false);
    }
    load();
  }, [fileId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="relative flex h-[90vh] w-[90vw] max-w-5xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="truncate text-sm font-medium text-black">{fileName}</h3>
          <div className="flex items-center gap-2">
            {downloadUrl && (
              <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="mr-1 h-3.5 w-3.5" />
                  Download
                </Button>
              </a>
            )}
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 items-center justify-center overflow-auto p-4">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading preview...</p>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="h-full w-full rounded border border-zinc-200"
              title={fileName}
            />
          ) : isImage && downloadUrl ? (
            <img
              src={downloadUrl}
              alt={fileName}
              className="max-h-full max-w-full rounded object-contain"
            />
          ) : isPdf && downloadUrl ? (
            <iframe
              src={`${downloadUrl}#toolbar=1`}
              className="h-full w-full rounded border border-zinc-200"
              title={fileName}
            />
          ) : isVideo && downloadUrl ? (
            <video controls className="max-h-full max-w-full rounded">
              <source src={downloadUrl} />
            </video>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center">
              <FileText className="h-12 w-12 text-zinc-400" />
              <p className="text-sm text-zinc-500">Preview not available for this file type.</p>
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download File
                  </Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
