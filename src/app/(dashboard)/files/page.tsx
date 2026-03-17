"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderOpen,
  File,
  Upload,
  Search,
  ChevronRight,
  MoreVertical,
  Download,
  ArrowLeft,
  Grid3X3,
  List,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Film,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilePreview } from "@/components/shared/file-preview";
import type { BoxItem } from "@/types/database";

const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_BOX_ROOT_FOLDER_ID || "309732853413";

function getFileIcon(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (["pdf", "doc", "docx", "fdx", "pages", "txt"].includes(ext)) return FileText;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return ImageIcon;
  if (["mp4", "mov", "avi", "wmv"].includes(ext)) return Film;
  return File;
}

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FilesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<BoxItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_FOLDER_ID);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: ROOT_FOLDER_ID, name: "TSC" },
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [contextMenu, setContextMenu] = useState<{ item: BoxItem; x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [boxError, setBoxError] = useState(false);

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    setSearch("");
    setBoxError(false);
    try {
      const res = await fetch(`/api/box/folders/${folderId}`);
      const data = await res.json();
      if (data.error) {
        console.error("Box error:", data.error);
        setBoxError(true);
        setItems([]);
      } else {
        setItems(data.items || []);
        setCurrentFolderId(folderId);
      }
    } catch (err) {
      console.error("Failed to load folder:", err);
      setBoxError(true);
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadFolder(ROOT_FOLDER_ID);
  }, [loadFolder]);

  useEffect(() => {
    function handleClick() { setContextMenu(null); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  async function handleSearch(query: string) {
    if (!query.trim()) {
      loadFolder(currentFolderId);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/box/search?q=${encodeURIComponent(query)}&folder=${ROOT_FOLDER_ID}`);
      const data = await res.json();
      setItems(data.entries || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
    setLoading(false);
  }

  function navigateToFolder(folder: BoxItem) {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    loadFolder(folder.id);
  }

  function navigateToBreadcrumb(index: number) {
    const crumb = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    loadFolder(crumb.id);
  }

  function goBack() {
    if (breadcrumbs.length > 1) {
      navigateToBreadcrumb(breadcrumbs.length - 2);
    }
  }

  async function handleDownload(fileId: string) {
    try {
      const res = await fetch(`/api/box/files/${fileId}`);
      const data = await res.json();
      if (data.download_url) {
        window.open(data.download_url, "_blank");
      }
    } catch (err) {
      console.error("Download failed:", err);
    }
  }

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);

    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folderId", currentFolderId);

      try {
        await fetch("/api/box/upload", { method: "POST", body: formData });
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setUploading(false);
    loadFolder(currentFolderId);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }

  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type === "file");

  return (
    <div
      className="flex flex-col gap-0"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-black">Files</h1>
          <p className="mt-1 text-sm text-zinc-500">Browse and manage company files.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-4 flex items-center gap-3">
        {breadcrumbs.length > 1 && (
          <Button variant="ghost" size="icon-sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center gap-1 text-sm text-zinc-500">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <button
                onClick={() => navigateToBreadcrumb(i)}
                className={`hover:text-black ${i === breadcrumbs.length - 1 ? "font-medium text-black" : ""}`}
              >
                {crumb.name}
              </button>
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                handleSearch(e.target.value);
              }}
              className="w-48 rounded-md border border-zinc-200 py-1.5 pl-8 pr-3 text-sm text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>
          <div className="flex rounded-md border border-zinc-200">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-zinc-100 text-black" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-zinc-100 text-black" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      {dragOver && (
        <div className="mt-4 flex items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50 py-12 text-sm text-blue-600">
          <Upload className="mr-2 h-5 w-5" />
          Drop files here to upload to Box
        </div>
      )}

      {/* Box connection error */}
      {boxError && !loading && (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 py-8 text-center">
          <p className="text-sm font-medium text-amber-800">Box connection expired</p>
          <p className="text-xs text-amber-600">Click below to re-authorize Box access.</p>
          <a
            href="/api/box/auth"
            className="inline-flex items-center gap-1.5 rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Re-authorize Box
          </a>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="mt-12 flex items-center justify-center text-sm text-zinc-400">Loading...</div>
      ) : viewMode === "list" ? (
        <div className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          <div className="grid grid-cols-[1fr_100px_120px_40px] gap-4 px-4 py-2 text-xs font-medium text-zinc-400">
            <span>Name</span>
            <span>Size</span>
            <span>Modified</span>
            <span />
          </div>

          {folders.map((folder) => (
            <div
              key={folder.id}
              className="group grid grid-cols-[1fr_100px_120px_40px] items-center gap-4 px-4 py-2.5 hover:bg-zinc-50"
            >
              <button onClick={() => navigateToFolder(folder)} className="flex items-center gap-3 text-left">
                <FolderOpen className="h-4 w-4 text-zinc-400" />
                <span className="truncate text-sm font-medium text-black">{folder.name}</span>
              </button>
              <span className="text-xs text-zinc-400">—</span>
              <span className="text-xs text-zinc-400">{formatDate(folder.modified_at)}</span>
              <span />
            </div>
          ))}

          {files.map((file) => {
            const Icon = getFileIcon(file.name);
            return (
              <div
                key={file.id}
                className="group grid grid-cols-[1fr_100px_120px_40px] items-center gap-4 px-4 py-2.5 hover:bg-zinc-50"
              >
                <button
                  onClick={() => { setPreviewFileId(file.id); setPreviewFileName(file.name); }}
                  className="flex items-center gap-3 text-left"
                >
                  <Icon className="h-4 w-4 text-zinc-400" />
                  <span className="truncate text-sm text-black">{file.name}</span>
                </button>
                <span className="text-xs text-zinc-400">{formatSize(file.size)}</span>
                <span className="text-xs text-zinc-400">{formatDate(file.modified_at)}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({ item: file, x: e.clientX, y: e.clientY });
                  }}
                  className="opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            );
          })}

          {folders.length === 0 && files.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-sm text-zinc-400">
              <FolderOpen className="h-8 w-8" />
              {search ? "No results found" : "This folder is empty"}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => navigateToFolder(folder)}
              className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 text-center hover:bg-zinc-50"
            >
              <FolderOpen className="h-8 w-8 text-zinc-400" />
              <span className="line-clamp-2 text-xs font-medium text-black">{folder.name}</span>
            </button>
          ))}
          {files.map((file) => {
            const Icon = getFileIcon(file.name);
            return (
              <button
                key={file.id}
                onClick={() => { setPreviewFileId(file.id); setPreviewFileName(file.name); }}
                className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 p-4 text-center hover:bg-zinc-50"
              >
                <Icon className="h-8 w-8 text-zinc-400" />
                <span className="line-clamp-2 text-xs text-black">{file.name}</span>
                <span className="text-[10px] text-zinc-400">{formatSize(file.size)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[140px] rounded-md border border-zinc-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => { handleDownload(contextMenu.item.id); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </button>
        </div>
      )}

      {/* Preview */}
      {previewFileId && (
        <FilePreview
          fileId={previewFileId}
          fileName={previewFileName}
          onClose={() => setPreviewFileId(null)}
        />
      )}
    </div>
  );
}
