"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera } from "lucide-react";
import { C } from "@/styles/tokens";
import { Field } from "@/components/ui/Field";
import { Pills } from "@/components/ui/Pills";
import { LiveCamera } from "@/components/camera/LiveCamera";
import { BoardPreview } from "@/components/camera/BoardPreview";
import { burnFile } from "@/components/camera/blackboard";
import { KOUTEI_OPTIONS, KOUSHU_SUGGESTIONS, Koutei } from "@/domain/site/Site";
import { createClient } from "@/lib/supabase/client";
import { SITE_PHOTOS_BUCKET, sitePhotoPath } from "@/lib/storage/sitePhotos";
import { savePhotoAction } from "@/app/actions/site";

export function PhotoCaptureForm({ siteId, siteName, koushuUsed }: { siteId: string; siteName: string; koushuUsed: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cam, setCam] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [koushu, setKoushu] = useState(koushuUsed[0] ?? KOUSHU_SUGGESTIONS[0]);
  const [koutei, setKoutei] = useState<Koutei>("着手前");
  const [basho, setBasho] = useState("");

  const koushuOptions = Array.from(new Set([...KOUSHU_SUGGESTIONS, ...koushuUsed]));
  const board = { kouji: siteName, koushu, koutei, basho };

  const save = (blob: Blob) => {
    setError("");
    setNotice("");
    startTransition(async () => {
      const supabase = createClient();
      const photoId = crypto.randomUUID();
      const filePath = sitePhotoPath(siteId, photoId);
      const { error: uploadError } = await supabase.storage.from(SITE_PHOTOS_BUCKET).upload(filePath, blob, {
        contentType: "image/jpeg",
      });
      if (uploadError) {
        setError(`アップロードに失敗しました: ${uploadError.message}`);
        return;
      }

      const r = await savePhotoAction(siteId, { koushu, koutei, spot: basho || undefined, shotAt: new Date().toISOString(), filePath });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setCam(false);
      setNotice(`${koushu}／${koutei} に保存しました`);
      router.refresh();
    });
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    try {
      const blob = await burnFile(file, board);
      save(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の処理に失敗しました");
    }
  };

  return (
    <div>
      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          工種（この中がフォルダになります）
        </span>
        <div className="mb-2">
          <Pills options={koushuOptions} value={koushu} onChange={setKoushu} />
        </div>
        <input
          value={koushu}
          onChange={(e) => setKoushu(e.target.value)}
          className="w-full px-3 py-2 text-[15px] outline-none"
          style={{ background: C.kami, border: `1px solid ${C.keisen}`, borderRadius: 4, color: C.sumi }}
        />
      </div>

      <div className="mb-3">
        <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
          作業工程
        </span>
        <div className="grid grid-cols-4 gap-1">
          {KOUTEI_OPTIONS.map((k) => (
            <button
              key={k}
              onClick={() => setKoutei(k)}
              className="py-2 text-[12px] font-extrabold rounded-sm"
              style={{ background: koutei === k ? C.ki : C.kami, color: C.sumi, border: `1px solid ${koutei === k ? C.ki : C.keisen}` }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <Field label="撮影箇所" value={basho} onChange={setBasho} placeholder="北面 全景" />

      {error && (
        <p className="text-[12px] mb-2" style={{ color: C.aka }}>
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="text-[12px] mb-2" style={{ color: C.midori }}>
          {notice}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => setCam(true)}
          disabled={pending}
          className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
          style={{ background: C.sumi, color: "#fff" }}
        >
          <Camera size={16} />
          カメラを起動
        </button>
        <label
          className="py-3 rounded-sm text-[13px] font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
          style={{ background: C.kami, color: C.sumi, border: `1px solid ${C.keisen}` }}
        >
          写真を選ぶ
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
        </label>
      </div>

      <span className="block text-[11px] font-bold mb-1" style={{ color: C.usu }}>
        仕上がり見本
      </span>
      <BoardPreview b={board} />

      {cam && <LiveCamera b={board} onCapture={save} onClose={() => setCam(false)} />}
    </div>
  );
}
