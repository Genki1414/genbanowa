import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Folder, ChevronRight } from "lucide-react";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { DenpyoCard } from "@/components/ui/DenpyoCard";
import { PhotoCaptureForm } from "@/components/domain/PhotoCaptureForm";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSite, loadPhotos } from "@/lib/supabase/siteRepo";
import { can } from "@/domain/auth/Permission";
import { KOUTEI_OPTIONS, groupByKoushu } from "@/domain/site/Site";

export default async function SiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "photo.view")) redirect("/sites");

  const { id } = await params;
  const supabase = await createClient();
  const site = await loadSite(supabase, id);
  if (!site) notFound();

  const photos = await loadPhotos(supabase, id);
  const folders = groupByKoushu(photos);
  const canCapture = can(actor.role, "photo.capture");

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader
        title={site.name}
        right={
          <span className="text-[12px] font-bold" style={{ color: C.ki }}>
            {photos.length}枚
          </span>
        }
      />
      <main className="max-w-md mx-auto p-3">
        {canCapture ? (
          <PhotoCaptureForm siteId={site.id} siteName={site.name} koushuUsed={folders.map((f) => f.koushu)} />
        ) : (
          <p className="text-[12px] mb-3" style={{ color: C.usu }}>
            このロールでは撮影できません。閲覧のみです。
          </p>
        )}

        <div className="mt-6">
          <h2 className="text-[13px] font-extrabold mb-2" style={{ color: C.sumi }}>
            工種フォルダ
          </h2>
          {folders.length === 0 ? (
            <p className="text-[13px] py-6 text-center" style={{ color: C.usu }}>
              撮影すると、工種ごとのフォルダに自動でしまわれます。
            </p>
          ) : (
            folders.map((f) => (
              <Link key={f.koushu} href={`/sites/${site.id}/${encodeURIComponent(f.koushu)}`} className="block w-full text-left">
                <DenpyoCard>
                  <div className="flex items-center gap-2">
                    <Folder size={18} style={{ color: C.sumi, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-extrabold" style={{ color: C.sumi }}>
                        {f.koushu}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: C.usu }}>
                        {KOUTEI_OPTIONS.filter((k) => f.photos.some((p) => p.koutei === k)).join("・")}
                      </div>
                    </div>
                    <span className="text-[13px] font-bold" style={{ color: C.usu }}>
                      {f.photos.length}
                    </span>
                    <ChevronRight size={17} style={{ color: C.usu }} />
                  </div>
                </DenpyoCard>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

