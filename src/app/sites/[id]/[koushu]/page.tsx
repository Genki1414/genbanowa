import { notFound, redirect } from "next/navigation";
import { C } from "@/styles/tokens";
import { BackHeader } from "@/components/domain/BackHeader";
import { Chip } from "@/components/ui/Chip";
import { currentActor } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadSite, loadPhotos } from "@/lib/supabase/siteRepo";
import { signSitePhotoUrls } from "@/lib/storage/sitePhotos";
import { can } from "@/domain/auth/Permission";
import { groupByKoutei } from "@/domain/site/Site";

export default async function KoushuPhotosPage({ params }: { params: Promise<{ id: string; koushu: string }> }) {
  const actor = await currentActor();
  if (!actor) redirect("/login");
  if (!can(actor.role, "photo.view")) redirect("/sites");

  const { id, koushu: koushuParam } = await params;
  const koushu = decodeURIComponent(koushuParam);

  const supabase = await createClient();
  const site = await loadSite(supabase, id);
  if (!site) notFound();

  const allPhotos = await loadPhotos(supabase, id);
  const photos = allPhotos.filter((p) => p.koushu === koushu);
  const groups = groupByKoutei(photos);
  const urlByPath = await signSitePhotoUrls(supabase, photos.map((p) => p.filePath));

  return (
    <div className="min-h-screen" style={{ background: C.yojo }}>
      <BackHeader
        title={`${site.name}／${koushu}`}
        right={
          <span className="text-[12px] font-bold" style={{ color: C.ki }}>
            {photos.length}枚
          </span>
        }
      />
      <main className="max-w-md mx-auto p-3">
        {groups.length === 0 && (
          <p className="text-[13px] py-10 text-center" style={{ color: C.usu }}>
            このフォルダにはまだ写真がありません。
          </p>
        )}
        {groups.map((g) => (
          <div key={g.koutei} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Chip solid color={C.sumi}>
                {g.koutei}
              </Chip>
              <span className="text-[12px]" style={{ color: C.usu }}>
                {g.photos.length}枚
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {g.photos.map((p) => {
                const url = urlByPath.get(p.filePath);
                return (
                  <div key={p.id}>
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={p.spot ?? koushu} className="w-full rounded-sm" style={{ border: `1px solid ${C.keisen}` }} />
                    ) : (
                      <div
                        className="w-full aspect-square rounded-sm flex items-center justify-center text-[11px]"
                        style={{ border: `1px solid ${C.keisen}`, color: C.usu, background: C.kami }}
                      >
                        表示できません
                      </div>
                    )}
                    <div className="text-[11px] mt-1 truncate" style={{ color: C.usu }}>
                      {p.spot || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
