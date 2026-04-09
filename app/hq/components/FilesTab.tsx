"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

function getPreviewType(type: string, name: string) {
  const t = type.toLowerCase();
  const n = name.toLowerCase();
  if (t.includes("image") || ["png","jpg","jpeg","gif","webp","svg"].some(e => t.includes(e) || n.endsWith("." + e))) return "image";
  if (t.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (t.includes("video") || ["mp4","webm","mov"].some(e => n.endsWith("." + e))) return "video";
  if (t.includes("audio") || ["mp3","wav","ogg"].some(e => n.endsWith("." + e))) return "audio";
  if (t.includes("text") || t.includes("json") || t.includes("csv") || t.includes("xml") || ["txt","md","json","csv","log","xml","html","css","js","ts","tsx"].some(e => n.endsWith("." + e))) return "text";
  return null;
}

function PreviewContent({ file }: { file: FileItem }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const type = getPreviewType(file.type, file.name);

  useEffect(() => {
    if (type === "text") {
      setLoading(true);
      fetch(`/api/r2/proxy?url=${encodeURIComponent(file.url)}`)
        .then(r => r.ok ? r.text() : fetch(file.url).then(r2 => r2.text()))
        .then(t => { setText(t); setLoading(false); })
        .catch(() => {
          fetch(file.url).then(r => r.text()).then(t => { setText(t); setLoading(false); }).catch(() => setLoading(false));
        });
    }
    setImgError(false);
  }, [file.url, type]);

  if (type === "image") {
    if (imgError) return (
      <div className="text-center py-10">
        <span className="text-5xl block mb-4">🖼️</span>
        <p className="text-sm text-slate-500">이미지를 불러올 수 없습니다</p>
        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3182F6] mt-2 inline-block">직접 열기 →</a>
      </div>
    );
    return <img src={file.url} alt={file.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" onError={() => setImgError(true)} />;
  }
  if (type === "pdf") return (
    <div className="w-full h-[70vh] flex flex-col">
      <iframe src={file.url + "#toolbar=1"} className="w-full flex-1 rounded-lg border-0" />
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3182F6] mt-2 text-center">PDF가 안 보이면 여기를 클릭하세요 →</a>
    </div>
  );
  if (type === "video") return <video src={file.url} controls className="max-w-full max-h-[70vh] rounded-lg" />;
  if (type === "audio") return <div className="text-center"><span className="text-5xl mb-4 block">🎵</span><p className="text-sm text-slate-500 mb-3">{file.name}</p><audio src={file.url} controls className="w-full max-w-md" /></div>;
  if (type === "text") {
    if (loading) return <div className="text-sm text-slate-400">불러오는 중...</div>;
    return (
      <pre className="w-full h-[70vh] overflow-auto bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-700 font-mono whitespace-pre-wrap break-words">
        {text ?? "내용을 불러올 수 없습니다"}
      </pre>
    );
  }
  return (
    <div className="text-center py-10">
      <span className="text-5xl block mb-4">{fileIcon(file.type)}</span>
      <p className="text-sm text-slate-500 mb-1">미리보기를 지원하지 않는 파일 형식입니다</p>
      <p className="text-xs text-slate-400 mb-3">{file.type || "알 수 없는 형식"}</p>
      <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#3182F6]">직접 열기 →</a>
    </div>
  );
}

// 권한: 대표/이사=전체, 팀장=업로드+본인삭제, 팀원=조회+업로드만
function getPermissions(myRole: HQRole, uploaderName: string, userName: string) {
  if (myRole === "대표" || myRole === "이사") return { canUpload: true, canDelete: true, canMove: true, canRename: true, canCreateFolder: true, canDeleteFolder: true };
  if (myRole === "팀장") return { canUpload: true, canDelete: uploaderName === userName, canMove: uploaderName === userName, canRename: uploaderName === userName, canCreateFolder: true, canDeleteFolder: false };
  return { canUpload: true, canDelete: uploaderName === userName, canMove: false, canRename: false, canCreateFolder: false, canDeleteFolder: false };
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
  const [preview, setPreview] = useState<FileItem | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [textContent, setTextContent] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = myRole === "대표" || myRole === "이사";
  const canCreateFolder = myRole !== "팀원";

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
    await s.from("hq_files").delete().eq("folder_id", id);
    await s.from("hq_folders").delete().eq("parent_id", id);
    await s.from("hq_folders").delete().eq("id", id);
    flash("폴더가 삭제되었습니다");
    setConfirmDelete(null);
    load(currentFolder);
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const s = sb();
    if (!s) return;
    setUploading(true);

    // 중복 체크
    const duplicate = files.find(ef => ef.name === file.name);
    if (duplicate) {
      const ok = confirm(`"${file.name}" 파일이 이미 존재합니다. 덮어쓰시겠습니까?`);
      if (!ok) {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      // 기존 파일 삭제
      await deleteFile(duplicate);
    }

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
    setConfirmDelete(null);
    load(currentFolder);
  };

  const renameFile = async (fileId: string) => {
    if (!renameValue.trim()) return;
    const s = sb();
    if (!s) return;
    // 같은 폴더에 같은 이름 있는지 체크
    const dup = files.find(f => f.name === renameValue.trim() && f.id !== fileId);
    if (dup) return flash("같은 이름의 파일이 이미 있습니다");
    await s.from("hq_files").update({ name: renameValue.trim() }).eq("id", fileId);
    setRenamingFile(null);
    setRenameValue("");
    flash("이름이 변경되었습니다");
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

  const canPreview = getPreviewType;

  return (
    <div className="space-y-5">
      {/* 삭제 확인 팝업 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">삭제 확인</h3>
              <p className="text-sm text-slate-500">
                <span className="font-semibold text-slate-700">&ldquo;{confirmDelete.name}&rdquo;</span>
                {confirmDelete.type === "folder" ? " 폴더와 내부 파일이" : " 파일이"} 영구 삭제됩니다.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className={`${B2} flex-1`}>취소</button>
              <button
                onClick={() => {
                  if (confirmDelete.type === "folder") deleteFolder(confirmDelete.id);
                  else { const f = files.find(x => x.id === confirmDelete.id); if (f) deleteFile(f); }
                }}
                className="flex-1 rounded-xl bg-red-500 text-white font-semibold px-4 py-2.5 text-sm hover:bg-red-600 transition-all"
              >삭제</button>
            </div>
          </div>
        </div>
      )}

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{fileIcon(preview.type)}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{preview.name}</p>
                  <p className="text-xs text-slate-400">{preview.size} · {preview.uploadedBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={preview.url} target="_blank" rel="noopener noreferrer" className="text-xs bg-[#3182F6] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#2672DE] transition">다운로드</a>
                <button onClick={() => setPreview(null)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">✕</button>
              </div>
            </div>
            {/* 콘텐츠 */}
            <div className="flex-1 overflow-auto p-5 flex items-center justify-center bg-slate-50/50 min-h-[300px]">
              <PreviewContent file={preview} />
            </div>
          </div>
        </div>
      )}
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
          {canCreateFolder && (
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
          )}
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
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: "folder", id: f.id, name: f.name }); }}
                  className="absolute top-2 right-2 text-xs text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              )}
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
                className="relative flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer"
                onClick={() => setPreview(f)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-lg flex-shrink-0">{fileIcon(f.type)}</span>
                  <div className="min-w-0">
                    {renamingFile === f.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          className="text-sm font-semibold text-slate-800 border border-[#3182F6] rounded-lg px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-100 w-48"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") renameFile(f.id); if (e.key === "Escape") { setRenamingFile(null); setRenameValue(""); } }}
                          autoFocus
                        />
                        <button onClick={() => renameFile(f.id)} className="text-xs text-[#3182F6] font-semibold">확인</button>
                        <button onClick={() => { setRenamingFile(null); setRenameValue(""); }} className="text-xs text-slate-400">취소</button>
                      </div>
                    ) : (
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {f.name}
                      {canPreview(f.type, f.name) && <span className="ml-1.5 text-[10px] text-[#3182F6] font-normal">미리보기</span>}
                    </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {f.size} · {f.uploadedBy} · {formatDate(f.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const perm = getPermissions(myRole, f.uploadedBy, userName);
                    return (
                      <>
                        <a href={f.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[#3182F6] hover:underline px-2 py-1">다운로드</a>
                        {perm.canRename && (
                          <button onClick={() => { setRenamingFile(f.id); setRenameValue(f.name); setMovingFile(null); }}
                            className="text-xs text-slate-400 hover:text-slate-700 transition-colors px-2 py-1">이름변경</button>
                        )}
                        {perm.canMove && (
                          <button onClick={() => { setMovingFile(movingFile === f.id ? null : f.id); setRenamingFile(null); }}
                            className="text-xs text-slate-400 hover:text-amber-600 transition-colors px-2 py-1">이동</button>
                        )}
                        {perm.canDelete && (
                          <button onClick={() => setConfirmDelete({ type: "file", id: f.id, name: f.name })}
                            className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1">삭제</button>
                        )}
                      </>
                    );
                  })()}
                </div>
                {movingFile === f.id && (
                  <div className="absolute right-0 top-full mt-1 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[180px]" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[10px] text-slate-400 font-semibold px-2 mb-1">이동할 폴더 선택</p>
                    {currentFolder && (
                      <button
                        onClick={() => moveFile(f.id, null)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600"
                      >
                        📂 루트
                      </button>
                    )}
                    {allFolders.filter(af => af.id !== currentFolder).map(af => (
                      <button
                        key={af.id}
                        onClick={() => moveFile(f.id, af.id)}
                        className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-slate-50 text-slate-600"
                      >
                        📁 {af.name}
                      </button>
                    ))}
                    <button
                      onClick={() => setMovingFile(null)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 text-slate-400 mt-1 border-t border-slate-100 pt-1.5"
                    >
                      취소
                    </button>
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
