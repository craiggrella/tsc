"use client";

import { useState, useEffect, useCallback } from "react";
import { X, FolderOpen, File, ChevronRight, Search, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BoxItem } from "@/types/database";

const ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_BOX_ROOT_FOLDER_ID || "309732853413";

interface SelectedFile {
  box_file_id: string;
  name: string;
}

interface FilePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (files: SelectedFile[]) => void;
  multiple?: boolean;
}

export function FilePicker({ open, onClose, onSelect, multiple = false }: FilePickerProps) {
  const [items, setItems] = useState<BoxItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_FOLDER_ID);
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: ROOT_FOLDER_ID, name: "TSC" },
  ]);
  const [selected, setSelected] = useState<SelectedFile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const loadFolder = useCallback(async (folderId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/box/folders/${folderId}`);
      const data = await res.json();
      setItems(data.items || []);
      setCurrentFolderId(folderId);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      loadFolder(ROOT_FOLDER_ID);
      setSelected([]);
      setSearch("");
      setBreadcrumbs([{ id: ROOT_FOLDER_ID, name: "TSC" }]);
    }
  }, [open, loadFolder]);

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
    } catch {
      setItems([]);
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

  function toggleSelect(file: BoxItem) {
    const entry: SelectedFile = { box_file_id: file.id, name: file.name };
    setSelected((prev) => {
      const exists = prev.find((f) => f.box_file_id === file.id);
      if (exists) return prev.filter((f) => f.box_file_id !== file.id);
      if (multiple) return [...prev, entry];
      return [entry];
    });
  }

  function confirm() {
    onSelect(selected);
    onClose();
  }

  if (!open) return null;

  const folders = items.filter((i) => i.type === "folder");
  const files = items.filter((i) => i.type === "file");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="flex h-[80vh] w-[90vw] max-w-3xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-sm font-medium text-black">Select File{multiple ? "s" : ""}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="border-b border-zinc-200 px-4 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); handleSearch(e.target.value); }}
              className="w-full rounded-md border border-zinc-200 py-1.5 pl-8 pr-3 text-sm text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Breadcrumbs */}
        {!search && (
          <div className="flex items-center gap-1 border-b border-zinc-100 px-4 py-2 text-xs text-zinc-500">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button onClick={() => navigateToBreadcrumb(i)} className="hover:text-black">
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">Loading...</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50"
                >
                  <FolderOpen className="h-4 w-4 text-zinc-400" />
                  <span className="truncate text-black">{folder.name}</span>
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-zinc-300" />
                </button>
              ))}
              {files.map((file) => {
                const isSelected = selected.some((f) => f.box_file_id === file.id);
                return (
                  <button
                    key={file.id}
                    onClick={() => toggleSelect(file)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 ${isSelected ? "bg-blue-50" : ""}`}
                  >
                    {isSelected ? (
                      <Check className="h-4 w-4 text-blue-600" />
                    ) : (
                      <File className="h-4 w-4 text-zinc-400" />
                    )}
                    <span className="truncate text-black">{file.name}</span>
                    {file.size && (
                      <span className="ml-auto text-xs text-zinc-400">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </button>
                );
              })}
              {folders.length === 0 && files.length === 0 && (
                <div className="flex h-32 items-center justify-center text-sm text-zinc-400">
                  {search ? "No files found" : "Empty folder"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3">
          <span className="text-xs text-zinc-500">
            {selected.length > 0 ? `${selected.length} file${selected.length > 1 ? "s" : ""} selected` : "No files selected"}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={confirm} disabled={selected.length === 0}>Attach</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
