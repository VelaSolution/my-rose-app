"use client";

import { useState, useEffect, useRef } from "react";
import { HQRole, Folder, FileItem } from "@/app/hq/types";
import { sb, today, I, C, L, B, B2, BADGE } from "@/app/hq/utils";

interface Props {
  userId: string;
  userName: string;
  myRole: HQRole;
  flash: (m: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  pdf: "📄",
  image: "🖼️",
  spreadsheet: "📊",
  document: "📝",
  default: "📎",
};

function fileIcon(type: string) {
  if (type.includes("pdf")) return FILE_ICONS.pdf;
  if (type.includes("image") || type.includes("png") || type.includes("jpg") || type.includes("jpeg"))
    return FILE_ICONS.image;
  if (type.includes("sheet") || type.includes("excel") || type.includes("csv") || type.includes("xlsx"))
    return FILE_ICONS.spreadsheet;
  if (type.includes("doc") || type.includes("word")) return FILE_ICONS.document;
  return FILE_ICONS.default;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function FilesTab({ userId, userName, myRole, flash }: Props) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const [breadcrumb, setBreadcrumb] = useState<{ id?: string; name: string }[]>([
    { name: "루트" },
  ]);
  const [newFolder, setNewFolder] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [movingFile, setMovingFile] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async (folderId?: string) => {
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
      setFolders(fRes.data.map((r: any) => ({ id: r.id, name: r.name, parentId: r.parent_id })));
    if (fileRes.data)
      setFiles(fileRes.data.map((r: any) => ({
        id: r.id, name: r.name, size: formatSize(r.size || 0),
        type: r.type || "", url: r.url || "", uploadedAt: r.created_at,
        uploadedBy: r.uploaded_by || "", folderId: r.folder_id,
      })));
    if (allF.data)
      setAllFolders(allF.data.map((r: any) => ({ id: r.id, name: r.name, parentId: r.parent_id })));

    setLoading(false);
  };

  useEffect(() => {
    load(currentFolder);
  }, [currentFolder]);

  const depth = breadcrumb.length - 1;

  const openFolder = (f: Folder) => {
    setCurrentFolder(f.id);
    setBreadcrumb((prev) => [...prev, { id: f.id, name: f.name }]);
  };

  const goTo = (idx: number) => {
    const target = breadcrumb[idx];
    setCurrentFolder(target.id);
    setBreadcrumb((prev) => prev.slice(0, idx + 1));
  };

  const createFolder = async () => {
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
    load(currentFolder);
  };

  const deleteFolder = async (id: string) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_folders").delete().eq("id", id);
    flash("폴더가 삭제되었습니다");
    load(currentFolder);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = sb();
    if (!s) return;
    setUploading(true);

    let uploaded = false;

    // 1차: R2 시도
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (currentFolder) formData.append("folder", currentFolder);

      const res = await fetch("/api/r2/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        await s.from("hq_files").insert({
          name: data.name,
          size: data.size,
          type: data.type,
          url: data.url,
          folder_id: currentFolder || null,
          uploaded_by: userName,
        });
        uploaded = true;
        flash("파일 업로드 완료");
      }
    } catch {}

    // 2차: R2 실패 시 Supabase Storage 폴백
    if (!uploaded) {
      try {
        const path = `${Date.now()}_${file.name}`;
        const { error: uploadErr } = await s.storage.from("hq-files").upload(path, file);
        if (uploadErr) {
          flash("업로드 실패: " + uploadErr.message);
          setUploading(false);
          if (fileRef.current) fileRef.current.value = "";
          return;
        }
        const { data: { publicUrl } } = s.storage.from("hq-files").getPublicUrl(path);
        await s.from("hq_files").insert({
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          folder_id: currentFolder || null,
          uploaded_by: userName,
        });
        uploaded = true;
        flash("파일 업로드 완료");
      } catch {
        flash("업로드 실패");
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
    load(currentFolder);
  };

  const deleteFile = async (f: FileItem) => {
    const s = sb();
    if (!s) return;

    // R2 또는 Supabase Storage에서 삭제 시도
    if (f.url.includes("r2.dev")) {
      try {
        const key = f.url.split(".r2.dev/")[1];
        if (key) await fetch("/api/r2/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: decodeURIComponent(key) }) });
      } catch {}
    } else if (f.url.includes("supabase")) {
      try {
        const path = f.url.split("/hq-files/")[1];
        if (path) await s.storage.from("hq-files").remove([decodeURIComponent(path)]);
      } catch {}
    }

    await s.from("hq_files").delete().eq("id", f.id);
    flash("파일이 삭제되었습니다");
    load(currentFolder);
  };

  const moveFile = async (fileId: string, targetFolderId: string | null) => {
    const s = sb();
    if (!s) return;
    await s.from("hq_files").update({ folder_id: targetFolderId }).eq("id", fileId);
    setMovingFile(null);
    flash("파일이 이동되었습니다");
    load(currentFolder);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className={C}>
        <div className="flex items-center gap-1 text-sm mb-4">
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">/</span>}
              <button
                onClick={() => goTo(i)}
                className={`px-1.5 py-0.5 rounded-lg transition-colors ${
                  i === breadcrumb.length - 1
                    ? "font-semibold text-slate-800"
                    : "text-slate-400 hover:text-[#3182F6]"
                }`}
              >
                {b.name}
              </button>
            </span>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              className={`${I} !w-48`}
              placeholder="새 폴더 이름"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
            />
            <button className={B2} onClick={createFolder}>
              폴더 생성
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={uploadFile}
            />
            <button
              className={B}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "업로드 중..." : "파일 업로드"}
            </button>
          </div>
        </div>
      </div>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {folders.map((f) => (
            <div
              key={f.id}
              className="group bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
            >
              <div onClick={() => openFolder(f)} className="flex items-center gap-3">
                <span className="text-2xl">📁</span>
                <span className="text-sm font-semibold text-slate-700 truncate">
                  {f.name}
                </span>
              </div>
              <button
                onClick={() => deleteFolder(f.id)}
                className="absolute top-2 right-2 text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Files */}
      <div className={C}>
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          파일{" "}
          <span className="font-normal text-slate-400">({files.length})</span>
        </h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            불러오는 중...
          </p>
        ) : files.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">
            파일이 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="relative flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">{fileIcon(f.type)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {f.name}
                    </p>
                    <p className="text-xs text-slate-400">
                      {f.size} · {f.uploadedBy} · {formatDate(f.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3182F6] hover:underline px-2 py-1"
                  >
                    다운로드
                  </a>
                  <button
                    onClick={() => setMovingFile(movingFile === f.id ? null : f.id)}
                    className="text-xs text-slate-400 hover:text-amber-600 transition-colors px-2 py-1"
                  >
                    이동
                  </button>
                  <button
                    onClick={() => deleteFile(f)}
                    className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
                  >
                    삭제
                  </button>
                </div>
                {movingFile === f.id && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[180px]">
                    <p className="text-[10px] text-slate-400 font-semibold px-2 mb-1">이동할 폴더 선택</p>
                    <button
                      onClick={() => moveFile(f.id, null)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600"
                    >
                      📂 루트
                    </button>
                    {allFolders.filter(af => af.id !== currentFolder).map(af => (
                      <button
                        key={af.id}
                        onClick={() => moveFile(f.id, af.id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600"
                      >
                        📁 {af.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
