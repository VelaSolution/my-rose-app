"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { HQRole, Folder, FileItem } from "@/app/hq/types";
import { sb, B2 } from "@/app/hq/utils";
import { FileRow } from "./files";
import { FileCard } from "./files";
import FilePreview from "./files/FilePreview";
import UploadArea from "./files/UploadArea";
import {
  SecurityLevel, SECURITY_LEVELS,
  fileIcon, fileCategory, formatSize, parseBytes,
  canAccessSecurity, getSecurityStyle, getPermissions, getPreviewType,
  IconFolder, IconFolderOpen, IconGrid, IconList,
  IconChevronRight, IconUpload, IconPlus, IconCheck, IconX,
  LargeFileIcon, LargeFolderIcon, CtxMenuItem,
} from "./files/FileHelpers";

/* ================================================================
   Props
   ================================================================ */
interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

/* ================================================================
   Context Menu component
   ================================================================ */
function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: CtxMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let nx = x, ny = y;
    if (rect.right > window.innerWidth - 8) nx = window.innerWidth - rect.width - 8;
    if (rect.bottom > window.innerHeight - 8) ny = window.innerHeight - rect.height - 8;
    if (nx !== x || ny !== y) setPos({ x: nx, y: ny });
  }, [x, y]);

  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("click", handler);
    window.addEventListener("contextmenu", handler);
    window.addEventListener("scroll", handler, true);
    return () => { window.removeEventListener("click", handler); window.removeEventListener("contextmenu", handler); window.removeEventListener("scroll", handler, true); };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-[100] min-w-[180px] bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200/80 py-1.5 animate-in fade-in duration-100"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) => item.divider ? (
        <div key={i} className="h-px bg-slate-100 my-1" />
      ) : (
        <button
          key={i}
          disabled={item.disabled}
          className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center gap-2.5 transition-colors
            ${item.disabled ? "text-slate-300 cursor-not-allowed" : item.danger ? "text-red-500 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}`}
          onClick={() => { item.onClick(); onClose(); }}
        >
          <span className="w-4 text-center text-sm">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

/* ================================================================
   Main Component
   ================================================================ */
export default function FilesTab({ userId, userName, myRole, flash }: Props) {
  /* -- state -- */
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const [breadcrumb, setBreadcrumb] = useState<{ id?: string; name: string }[]>([{ name: "루트" }]);
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [movingFile, setMovingFile] = useState<string | null>(null);
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [uploadSecurity, setUploadSecurity] = useState<SecurityLevel>("내부용");
  const [securityFilter, setSecurityFilter] = useState<SecurityLevel | "all">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [groupByType, setGroupByType] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; items: CtxMenuItem[] } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkSecurityOpen, setBulkSecurityOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  const isAdmin = myRole === "대표" || myRole === "이사";
  const canCreateFolder = myRole !== "팀원";

  /* -- data loading -- */
  const load = useCallback(async (folderId?: string) => {
    const s = sb();
    if (!s) return setLoading(false);

    const [fRes, fileRes, allF] = await Promise.all([
      folderId
        ? s.from("hq_folders").select("*").eq("parent_id", folderId)
        : s.from("hq_folders").select("*").is("parent_id", null),
      folderId
        ? s.from("hq_files").select("*").eq("folder_id", folderId)
        : s.from("hq_files").select("*").is("folder_id", null),
      s.from("hq_folders").select("*").order("name"),
    ]);

    if (fRes.data)
      setFolders(fRes.data.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, parentId: r.parent_id as string | undefined })));
    if (fileRes.data)
      setFiles(fileRes.data.map((r: Record<string, unknown>) => ({
        id: r.id as string, name: r.name as string, size: formatSize((r.size as number) || 0),
        type: (r.type as string) || "", url: (r.url as string) || "", uploadedAt: r.created_at as string,
        uploadedBy: (r.uploaded_by as string) || "", folderId: r.folder_id as string | undefined,
        security: (r.security as string) || "내부용",
      })));
    if (allF.data)
      setAllFolders(allF.data.map((r: Record<string, unknown>) => ({ id: r.id as string, name: r.name as string, parentId: r.parent_id as string | undefined })));

    setLoading(false);
  }, []);

  useEffect(() => { load(currentFolder); }, [currentFolder, load]);

  /* -- navigation -- */
  const openFolder = useCallback((f: Folder) => {
    setCurrentFolder(f.id);
    setBreadcrumb((prev) => [...prev, { id: f.id, name: f.name }]);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, []);

  const goTo = useCallback((idx: number) => {
    const target = breadcrumb[idx];
    setCurrentFolder(target.id);
    setBreadcrumb((prev) => prev.slice(0, idx + 1));
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
  }, [breadcrumb]);

  /* -- CRUD operations -- */
  const createFolder = useCallback(async () => {
    if (!newFolder.trim()) return;
    const s = sb();
    if (!s) return;
    const { error } = await s.from("hq_folders").insert({
      name: newFolder.trim(),
      parent_id: currentFolder || null,
      created_at: new Date().toISOString(),
    });
    if (error) return flash("폴더 생성 실패");
    flash("폴더가 생성되었습니다");
    setNewFolder("");
    setShowNewFolder(false);
    load(currentFolder);
  }, [newFolder, currentFolder, flash, load]);

  const deleteFolder = useCallback(async (id: string) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_files").delete().eq("folder_id", id);
    await s.from("hq_folders").delete().eq("parent_id", id);
    await s.from("hq_folders").delete().eq("id", id);
    flash("폴더가 삭제되었습니다");
    setConfirmDelete(null);
    load(currentFolder);
  }, [currentFolder, flash, load]);

  const deleteFileSilent = useCallback(async (f: FileItem) => {
    const s = sb();
    if (!s) return;
    if (f.url.includes("r2.dev")) {
      try { const key = f.url.split(".r2.dev/")[1]; if (key) await fetch("/api/r2/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: decodeURIComponent(key) }) }); } catch {}
    } else if (f.url.includes("supabase")) {
      try { const path = f.url.split("/hq-files/")[1]; if (path) await s.storage.from("hq-files").remove([decodeURIComponent(path)]); } catch {}
    }
    await s.from("hq_files").delete().eq("id", f.id);
  }, []);

  const deleteFile = useCallback(async (f: FileItem) => {
    await deleteFileSilent(f);
    flash("파일이 삭제되었습니다");
    setConfirmDelete(null);
    load(currentFolder);
  }, [deleteFileSilent, flash, load, currentFolder]);

  const renameFile = useCallback(async (fileId: string) => {
    if (!renameValue.trim()) return;
    const s = sb();
    if (!s) return;
    const dup = files.find(f => f.name === renameValue.trim() && f.id !== fileId);
    if (dup) return flash("같은 이름의 파일이 이미 있습니다");
    await s.from("hq_files").update({ name: renameValue.trim() }).eq("id", fileId);
    setRenamingFile(null);
    setRenameValue("");
    flash("이름이 변경되었습니다");
    load(currentFolder);
  }, [renameValue, files, flash, load, currentFolder]);

  const renameFolderFn = useCallback(async (folderId: string) => {
    if (!renameValue.trim()) return;
    const s = sb();
    if (!s) return;
    await s.from("hq_folders").update({ name: renameValue.trim() }).eq("id", folderId);
    setRenamingFolder(null);
    setRenameValue("");
    flash("폴더 이름이 변경되었습니다");
    setBreadcrumb(prev => prev.map(b => b.id === folderId ? { ...b, name: renameValue.trim() } : b));
    load(currentFolder);
  }, [renameValue, flash, load, currentFolder]);

  const changeSecurity = useCallback(async (fileId: string, level: SecurityLevel) => {
    const s = sb();
    if (!s) { flash("DB 연결 실패"); return; }
    const { error } = await s.from("hq_files").update({ security: level }).eq("id", fileId);
    if (error) { flash("등급 변경 실패: " + error.message); console.error("changeSecurity error:", error); return; }
    flash(`보안등급: ${level}`);
    load(currentFolder);
  }, [flash, load, currentFolder]);

  const moveFile = useCallback(async (fileId: string, targetFolderId: string | null) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_files").update({ folder_id: targetFolderId }).eq("id", fileId);
    setMovingFile(null);
    flash("파일이 이동되었습니다");
    load(currentFolder);
  }, [flash, load, currentFolder]);

  /* -- bulk operations -- */
  const bulkDelete = useCallback(async () => {
    const toDelete = files.filter(f => selectedFiles.has(f.id));
    if (toDelete.length === 0) return;
    for (const f of toDelete) await deleteFileSilent(f);
    const s = sb();
    if (s) {
      for (const fid of selectedFolders) {
        await s.from("hq_files").delete().eq("folder_id", fid);
        await s.from("hq_folders").delete().eq("parent_id", fid);
        await s.from("hq_folders").delete().eq("id", fid);
      }
    }
    flash(`${toDelete.length + selectedFolders.size}개 항목이 삭제되었습니다`);
    setSelectedFiles(new Set());
    setSelectedFolders(new Set());
    setConfirmDelete(null);
    load(currentFolder);
  }, [files, selectedFiles, selectedFolders, deleteFileSilent, flash, load, currentFolder]);

  const bulkMove = useCallback(async (targetFolderId: string | null) => {
    const s = sb();
    if (!s) return;
    for (const fid of selectedFiles) {
      await s.from("hq_files").update({ folder_id: targetFolderId }).eq("id", fid);
    }
    flash(`${selectedFiles.size}개 파일이 이동되었습니다`);
    setSelectedFiles(new Set());
    setBulkMoveOpen(false);
    load(currentFolder);
  }, [selectedFiles, flash, load, currentFolder]);

  const bulkChangeSecurity = useCallback(async (level: SecurityLevel) => {
    const s = sb();
    if (!s) return;
    for (const fid of selectedFiles) {
      await s.from("hq_files").update({ security: level }).eq("id", fid);
    }
    flash(`${selectedFiles.size}개 파일의 보안등급이 변경되었습니다`);
    setSelectedFiles(new Set());
    setBulkSecurityOpen(false);
    load(currentFolder);
  }, [selectedFiles, flash, load, currentFolder]);

  /* -- drag & drop -- */
  const handleDragStart = useCallback((e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData("text/plain", fileId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    const fileId = e.dataTransfer.getData("text/plain");
    if (!fileId) return;
    if (selectedFiles.has(fileId) && selectedFiles.size > 1) {
      const s = sb();
      if (!s) return;
      for (const fid of selectedFiles) {
        await s.from("hq_files").update({ folder_id: targetFolderId }).eq("id", fid);
      }
      flash(`${selectedFiles.size}개 파일이 이동되었습니다`);
      setSelectedFiles(new Set());
    } else {
      await moveFile(fileId, targetFolderId);
    }
    load(currentFolder);
  }, [selectedFiles, moveFile, flash, load, currentFolder]);

  const handleRootDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverRoot(false);
    setIsDraggingOver(false);
    const fileId = e.dataTransfer.getData("text/plain");
    if (fileId) {
      if (selectedFiles.has(fileId) && selectedFiles.size > 1) {
        const s = sb();
        if (!s) return;
        for (const fid of selectedFiles) {
          await s.from("hq_files").update({ folder_id: null }).eq("id", fid);
        }
        flash(`${selectedFiles.size}개 파일이 루트로 이동되었습니다`);
        setSelectedFiles(new Set());
      } else {
        await moveFile(fileId, null);
      }
      load(currentFolder);
      return;
    }
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const dt = new DataTransfer();
      dt.items.add(droppedFiles[0]);
      if (fileRef.current) {
        fileRef.current.files = dt.files;
        fileRef.current.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  }, [selectedFiles, moveFile, flash, load, currentFolder]);

  /* -- context menu builders -- */
  const buildFileCtx = useCallback((f: FileItem, x: number, y: number) => {
    const perm = getPermissions(myRole, f.uploadedBy, userName);
    const items: CtxMenuItem[] = [
      { label: "열기", icon: "👁", onClick: () => setPreview(f) },
      { label: "다운로드", icon: "⬇", onClick: () => window.open(f.url, "_blank") },
      { label: "", icon: "", divider: true, onClick: () => {} },
      { label: "이름 변경", icon: "✏", disabled: !perm.canRename, onClick: () => { setRenamingFile(f.id); setRenameValue(f.name); } },
      { label: "이동", icon: "📂", disabled: !perm.canMove, onClick: () => setMovingFile(movingFile === f.id ? null : f.id) },
      { label: "보안등급 변경", icon: "🔒", disabled: !isAdmin, onClick: () => {
        const next = SECURITY_LEVELS[(SECURITY_LEVELS.findIndex(s => s.value === (f.security as SecurityLevel || "내부용")) + 1) % SECURITY_LEVELS.length];
        changeSecurity(f.id, next.value);
      }},
      { label: "", icon: "", divider: true, onClick: () => {} },
      { label: "삭제", icon: "🗑", danger: true, disabled: !perm.canDelete, onClick: () => setConfirmDelete({ type: "file", id: f.id, name: f.name }) },
    ];
    setCtxMenu({ x, y, items });
  }, [myRole, userName, isAdmin, movingFile, changeSecurity]);

  const buildFolderCtx = useCallback((f: Folder, x: number, y: number) => {
    const items: CtxMenuItem[] = [
      { label: "열기", icon: "📂", onClick: () => openFolder(f) },
      { label: "이름 변경", icon: "✏", disabled: !canCreateFolder, onClick: () => { setRenamingFolder(f.id); setRenameValue(f.name); } },
      { label: "", icon: "", divider: true, onClick: () => {} },
      { label: "삭제", icon: "🗑", danger: true, disabled: !isAdmin, onClick: () => setConfirmDelete({ type: "folder", id: f.id, name: f.name }) },
    ];
    setCtxMenu({ x, y, items });
  }, [openFolder, canCreateFolder, isAdmin]);

  /* -- selection helpers -- */
  const toggleFileSelect = useCallback((id: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleFolderSelect = useCallback((id: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  /* -- computed: filtered & sorted files -- */
  const accessibleFiles = useMemo(() =>
    files.filter(f => canAccessSecurity(myRole, (f.security as SecurityLevel) || "내부용")),
    [files, myRole]
  );

  const filteredFiles = useMemo(() => {
    const filtered = securityFilter === "all" ? accessibleFiles : accessibleFiles.filter(f => (f.security || "내부용") === securityFilter);
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name, "ko");
      else if (sortBy === "date") cmp = (a.uploadedAt || "").localeCompare(b.uploadedAt || "");
      else if (sortBy === "size") cmp = parseBytes(a.size) - parseBytes(b.size);
      else if (sortBy === "type") cmp = (a.type || "").localeCompare(b.type || "");
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [accessibleFiles, securityFilter, sortBy, sortDir]);

  const totalSize = useMemo(() => {
    const bytes = filteredFiles.reduce((acc, f) => acc + parseBytes(f.size), 0);
    return formatSize(bytes);
  }, [filteredFiles]);

  const groupedFiles = useMemo(() => {
    if (!groupByType) return null;
    const groups: Record<string, FileItem[]> = {};
    for (const f of filteredFiles) {
      const cat = fileCategory(f.type, f.name);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    }
    return groups;
  }, [groupByType, filteredFiles]);

  const isAllSelected = filteredFiles.length > 0 && selectedFiles.size === filteredFiles.length && selectedFolders.size === folders.length;
  const hasSelection = selectedFiles.size > 0 || selectedFolders.size > 0;

  /* -- auto-focus refs -- */
  useEffect(() => {
    if (showNewFolder && newFolderRef.current) newFolderRef.current.focus();
  }, [showNewFolder]);
  useEffect(() => {
    if ((renamingFile || renamingFolder) && renameRef.current) renameRef.current.focus();
  }, [renamingFile, renamingFolder]);

  /* -- render helpers -- */
  const renderSortButton = (key: "name" | "date" | "size" | "type", label: string) => (
    <button
      key={key}
      onClick={() => { if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(key); setSortDir(key === "name" ? "asc" : "desc"); } }}
      className={`text-xs px-2.5 py-1 rounded-lg transition-all font-medium ${sortBy === key ? "bg-[#3182F6]/10 text-[#3182F6]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
    >
      {label}{sortBy === key && (sortDir === "asc" ? " ↑" : " ↓")}
    </button>
  );

  /* -- render folder (shared) -- */
  const renderFolder = (f: Folder, isGrid: boolean) => {
    const isFolderSelected = selectedFolders.has(f.id);
    const isDragTarget = dragOverFolder === f.id;
    const isRenaming = renamingFolder === f.id;

    const inner = isGrid ? (
      <div className="flex flex-col items-center">
        <LargeFolderIcon highlight={isDragTarget} />
        {isRenaming ? (
          <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
            <input
              ref={renameRef}
              className="text-xs font-semibold text-slate-800 border border-[#3182F6] rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-100 w-full text-center"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") renameFolderFn(f.id); if (e.key === "Escape") { setRenamingFolder(null); setRenameValue(""); } }}
            />
          </div>
        ) : (
          <p className="text-xs font-medium text-slate-700 mt-3 text-center truncate w-full px-1">{f.name}</p>
        )}
      </div>
    ) : (
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer
          ${isFolderSelected ? "bg-[#3182F6] border-[#3182F6] text-white" : "border-slate-200 group-hover:border-slate-300"}`}
          onClick={(e) => { e.stopPropagation(); toggleFolderSelect(f.id); }}
        >
          {isFolderSelected && <IconCheck />}
        </div>
        <IconFolder className={`w-5 h-5 flex-shrink-0 ${isDragTarget ? "text-[#3182F6]" : "text-amber-400"}`} />
        {isRenaming ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={renameRef}
              className="text-sm font-semibold text-slate-800 border border-[#3182F6] rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-100 w-48"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") renameFolderFn(f.id); if (e.key === "Escape") { setRenamingFolder(null); setRenameValue(""); } }}
            />
            <button onClick={() => renameFolderFn(f.id)} className="text-xs text-[#3182F6] font-semibold hover:underline">확인</button>
            <button onClick={() => { setRenamingFolder(null); setRenameValue(""); }} className="text-xs text-slate-400">취소</button>
          </div>
        ) : (
          <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
        )}
      </div>
    );

    return (
      <div
        key={f.id}
        className={`group relative rounded-2xl transition-all cursor-pointer border
          ${isGrid ? "flex flex-col items-center p-4" : "flex items-center px-3 py-2.5"}
          ${isFolderSelected ? "bg-[#3182F6]/5 border-[#3182F6]/20" : isDragTarget ? "bg-blue-50 border-[#3182F6]/30 shadow-md" : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-md"}`}
        onDoubleClick={() => openFolder(f)}
        onClick={() => { if (!isRenaming) openFolder(f); }}
        onContextMenu={(e) => { e.preventDefault(); buildFolderCtx(f, e.clientX, e.clientY); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOverFolder(f.id); }}
        onDragLeave={() => setDragOverFolder(null)}
        onDrop={(e) => handleFolderDrop(e, f.id)}
      >
        {isGrid && (
          <div
            className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer
              ${isFolderSelected ? "bg-[#3182F6] border-[#3182F6] text-white" : "border-transparent group-hover:border-slate-200"}`}
            onClick={(e) => { e.stopPropagation(); toggleFolderSelect(f.id); }}
          >
            {isFolderSelected && <IconCheck />}
          </div>
        )}
        {inner}
        {isAdmin && !isGrid && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "folder", id: f.id, name: f.name }); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  /* -- render file items using extracted components -- */
  const renderFileRow = (f: FileItem) => (
    <FileRow
      key={f.id}
      file={f}
      myRole={myRole}
      userName={userName}
      isSelected={selectedFiles.has(f.id)}
      isRenaming={renamingFile === f.id}
      isMoving={movingFile === f.id}
      renameValue={renameValue}
      movingFile={movingFile}
      currentFolder={currentFolder}
      allFolders={allFolders}
      isAdmin={isAdmin}
      onPreview={setPreview}
      onToggleSelect={toggleFileSelect}
      onDragStart={handleDragStart}
      onContextMenu={buildFileCtx}
      onRenameChange={setRenameValue}
      onRenameConfirm={renameFile}
      onRenameCancel={() => { setRenamingFile(null); setRenameValue(""); }}
      onChangeSecurity={changeSecurity}
      onMoveFile={moveFile}
      onSetMovingFile={setMovingFile}
      onSetConfirmDelete={setConfirmDelete}
      renameRef={renameRef}
    />
  );

  const renderFileCard = (f: FileItem) => (
    <FileCard
      key={f.id}
      file={f}
      myRole={myRole}
      userName={userName}
      isSelected={selectedFiles.has(f.id)}
      isRenaming={renamingFile === f.id}
      renameValue={renameValue}
      onPreview={setPreview}
      onToggleSelect={toggleFileSelect}
      onDragStart={handleDragStart}
      onContextMenu={buildFileCtx}
      onRenameChange={setRenameValue}
      onRenameConfirm={renameFile}
      onRenameCancel={() => { setRenamingFile(null); setRenameValue(""); }}
      renameRef={renameRef}
    />
  );

  /* -- main render -- */
  return (
    <div className="space-y-0">
      {/* context menu */}
      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={() => setCtxMenu(null)} />}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">삭제 확인</h3>
              <p className="text-sm text-slate-500">
                {hasSelection && confirmDelete.name === "__bulk__" ? (
                  <><span className="font-semibold text-slate-700">{selectedFiles.size + selectedFolders.size}개 항목</span>이 영구 삭제됩니다.</>
                ) : (
                  <><span className="font-semibold text-slate-700">&ldquo;{confirmDelete.name}&rdquo;</span>
                  {confirmDelete.type === "folder" ? " 폴더와 내부 파일이" : " 파일이"} 영구 삭제됩니다.</>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className={`${B2} flex-1`}>취소</button>
              <button
                onClick={() => {
                  if (confirmDelete.name === "__bulk__") { bulkDelete(); return; }
                  if (confirmDelete.type === "folder") deleteFolder(confirmDelete.id);
                  else { const f = files.find(x => x.id === confirmDelete.id); if (f) deleteFile(f); }
                }}
                className="flex-1 rounded-xl bg-red-500 text-white font-semibold px-4 py-2.5 text-sm hover:bg-red-600 active:scale-[0.98] transition-all"
              >삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}

      {/* Bulk move modal */}
      {bulkMoveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setBulkMoveOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 mb-3">{selectedFiles.size}개 파일 이동</h3>
            <div className="space-y-1 max-h-60 overflow-auto">
              {currentFolder && (
                <button onClick={() => bulkMove(null)} className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 flex items-center gap-2.5">
                  <IconFolderOpen className="w-4 h-4 text-amber-400" /> 루트
                </button>
              )}
              {allFolders.filter(af => af.id !== currentFolder).map(af => (
                <button key={af.id} onClick={() => bulkMove(af.id)} className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 flex items-center gap-2.5">
                  <IconFolder className="w-4 h-4 text-amber-400" /> {af.name}
                </button>
              ))}
            </div>
            <button onClick={() => setBulkMoveOpen(false)} className={`${B2} w-full mt-3`}>취소</button>
          </div>
        </div>
      )}

      {/* Bulk security modal */}
      {bulkSecurityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setBulkSecurityOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 mb-3">{selectedFiles.size}개 파일 보안등급 변경</h3>
            <div className="space-y-1">
              {SECURITY_LEVELS.map(s => (
                <button key={s.value} onClick={() => bulkChangeSecurity(s.value)}
                  className={`w-full text-left text-sm px-3 py-2.5 rounded-xl hover:opacity-80 flex items-center gap-2.5 ${s.color}`}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
            <button onClick={() => setBulkSecurityOpen(false)} className={`${B2} w-full mt-3`}>취소</button>
          </div>
        </div>
      )}

      {/* FILE MANAGER CHROME */}
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="border-b border-slate-100 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* left: navigation + breadcrumb */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                disabled={breadcrumb.length <= 1}
                onClick={() => goTo(breadcrumb.length - 2)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${breadcrumb.length > 1 ? "hover:bg-slate-100 text-slate-500" : "text-slate-200 cursor-not-allowed"}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div className="w-px h-5 bg-slate-100" />
              <div className="flex items-center gap-0.5 text-sm min-w-0 overflow-hidden">
                {breadcrumb.map((b, i) => (
                  <span key={i} className="flex items-center gap-0.5 flex-shrink-0">
                    {i > 0 && <IconChevronRight />}
                    <button
                      onClick={() => goTo(i)}
                      className={`px-1.5 py-0.5 rounded-md transition-colors truncate max-w-[120px] ${
                        i === breadcrumb.length - 1
                          ? "font-semibold text-slate-800"
                          : "text-slate-400 hover:text-[#3182F6] hover:bg-[#3182F6]/5"
                      }`}
                    >
                      {i === 0 ? (
                        <svg className="w-4 h-4 inline -mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      ) : b.name}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* right: actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <div className="flex items-center bg-slate-50 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  title="리스트 보기"
                >
                  <IconList />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white text-[#3182F6] shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  title="그리드 보기"
                >
                  <IconGrid />
                </button>
              </div>

              <div className="w-px h-5 bg-slate-100" />

              <button
                onClick={() => setGroupByType(!groupByType)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${groupByType ? "bg-[#3182F6]/10 text-[#3182F6]" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"}`}
                title="유형별 그룹"
              >
                유형별
              </button>

              <div className="w-px h-5 bg-slate-100" />

              {canCreateFolder && (
                <button
                  onClick={() => { setShowNewFolder(!showNewFolder); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
                  title="새 폴더"
                >
                  <IconPlus />
                </button>
              )}

              {/* upload */}
              <UploadArea
                userName={userName}
                currentFolder={currentFolder}
                uploadSecurity={uploadSecurity}
                files={files}
                flash={flash}
                onUploadComplete={() => load(currentFolder)}
                fileRef={fileRef}
                uploading={uploading}
                setUploading={setUploading}
                deleteFileSilent={deleteFileSilent}
              />

              {/* upload security */}
              <select
                className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600 outline-none focus:border-[#3182F6]"
                value={uploadSecurity}
                onChange={e => setUploadSecurity(e.target.value as SecurityLevel)}
              >
                {SECURITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
              </select>
            </div>
          </div>

          {/* new folder input row */}
          {showNewFolder && (
            <div className="mt-3 flex items-center gap-2">
              <IconFolder className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <input
                ref={newFolderRef}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#3182F6] focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="새 폴더 이름을 입력하세요"
                value={newFolder}
                onChange={(e) => setNewFolder(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolder(""); } }}
              />
              <button onClick={createFolder} className="text-xs text-[#3182F6] font-semibold hover:underline px-2">생성</button>
              <button onClick={() => { setShowNewFolder(false); setNewFolder(""); }} className="text-xs text-slate-400 hover:text-slate-600 px-2">취소</button>
            </div>
          )}
        </div>

        {/* Filter bar + info bar */}
        <div className="border-b border-slate-50 px-4 py-2 flex items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-1.5">
            <button onClick={() => setSecurityFilter("all")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${securityFilter === "all" ? "bg-[#3182F6] text-white shadow-sm" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"}`}>
              전체
            </button>
            {SECURITY_LEVELS.map(s => (
              <button key={s.value} onClick={() => setSecurityFilter(s.value)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${securityFilter === s.value ? "bg-[#3182F6] text-white shadow-sm" : `bg-white border border-slate-200 hover:bg-slate-100 text-slate-500`}`}>
                {s.icon} {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{folders.length}개 폴더, {filteredFiles.length}개 파일</span>
            <span className="text-slate-300">|</span>
            <span>{totalSize}</span>
          </div>
        </div>

        {/* Sort bar */}
        <div className="border-b border-slate-50 px-4 py-1.5 flex items-center justify-between bg-white">
          <div className="flex items-center gap-1">
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer mr-2 transition-all
                ${isAllSelected ? "bg-[#3182F6] border-[#3182F6] text-white" : "border-slate-200 hover:border-slate-300"}`}
              onClick={() => {
                if (isAllSelected) { setSelectedFiles(new Set()); setSelectedFolders(new Set()); }
                else { setSelectedFiles(new Set(filteredFiles.map(f => f.id))); setSelectedFolders(new Set(folders.map(f => f.id))); }
              }}
            >
              {isAllSelected && <IconCheck />}
            </div>

            {hasSelection ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#3182F6] font-semibold">{selectedFiles.size + selectedFolders.size}개 선택</span>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                {selectedFiles.size > 0 && isAdmin && (
                  <>
                    <button onClick={() => setBulkMoveOpen(true)} className="text-xs text-slate-500 hover:text-[#3182F6] font-medium px-3 py-2 rounded-lg hover:bg-[#3182F6]/5 transition-all">이동</button>
                    <button onClick={() => setBulkSecurityOpen(true)} className="text-xs text-slate-500 hover:text-[#3182F6] font-medium px-3 py-2 rounded-lg hover:bg-[#3182F6]/5 transition-all">보안등급</button>
                  </>
                )}
                <button onClick={() => setConfirmDelete({ type: "file", id: "__bulk__", name: "__bulk__" })}
                  className="text-xs text-slate-500 hover:text-red-500 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-all">삭제</button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button onClick={() => { setSelectedFiles(new Set()); setSelectedFolders(new Set()); }} className="text-xs text-slate-400 hover:text-slate-600">선택 해제</button>
              </div>
            ) : (
              <div className="flex items-center gap-0.5">
                {renderSortButton("name", "이름")}
                {renderSortButton("date", "날짜")}
                {renderSortButton("size", "크기")}
                {renderSortButton("type", "유형")}
              </div>
            )}
          </div>
        </div>

        {/* Content area */}
        <div
          className={`px-4 py-3 min-h-[300px] transition-colors ${isDraggingOver ? "bg-[#3182F6]/[0.03]" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); if (!dragOverFolder) setDragOverRoot(true); }}
          onDragLeave={(e) => { if (e.currentTarget === e.target) { setIsDraggingOver(false); setDragOverRoot(false); } }}
          onDrop={handleRootDrop}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-400">불러오는 중...</span>
              </div>
            </div>
          ) : folders.length === 0 && filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">이 폴더는 비어있습니다</p>
              <p className="text-xs text-slate-400 mb-4">파일을 드래그하여 업로드하거나, 위의 업로드 버튼을 사용하세요</p>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 border border-dashed border-slate-200 rounded-xl px-4 py-3">
                  <IconUpload />
                  <span>파일을 여기에 드래그</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Folders section */}
              {folders.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">폴더</p>
                  <div className={viewMode === "grid"
                    ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2"
                    : "space-y-1"
                  }>
                    {folders.map(f => renderFolder(f, viewMode === "grid"))}
                  </div>
                </div>
              )}

              {/* Files section */}
              {filteredFiles.length > 0 && (
                <div>
                  {folders.length > 0 && <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">파일</p>}

                  {groupedFiles ? (
                    <div className="space-y-4">
                      {Object.entries(groupedFiles).map(([cat, groupFiles]) => (
                        <div key={cat}>
                          <p className="text-xs font-semibold text-slate-500 mb-2 px-1 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#3182F6]" />
                            {cat}
                            <span className="text-slate-300 font-normal">({groupFiles.length})</span>
                          </p>
                          {viewMode === "grid" ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                              {groupFiles.map(f => renderFileCard(f))}
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              {groupFiles.map(f => renderFileRow(f))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : viewMode === "grid" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                      {filteredFiles.map(f => renderFileCard(f))}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredFiles.map(f => renderFileRow(f))}
                    </div>
                  )}
                </div>
              )}

              {filteredFiles.length === 0 && folders.length === 0 && securityFilter !== "all" && (
                <div className="text-center py-12">
                  <p className="text-sm text-slate-400">해당 보안등급의 파일이 없습니다</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 bg-slate-50/30">
          <span>{folders.length}개 폴더, {filteredFiles.length}개 파일 {securityFilter !== "all" && `(${securityFilter} 필터 적용)`}</span>
          <span>총 {totalSize}</span>
        </div>
      </div>
    </div>
  );
}
