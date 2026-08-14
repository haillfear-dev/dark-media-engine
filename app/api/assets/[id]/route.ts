import { one, Row } from "@/src/db";
import { getAssetStorage } from "@/src/assets/storage";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = one<Row>("SELECT storage_location,mime_type FROM assets WHERE id=?", id);
  if (!asset) return new Response("Not found", { status: 404 });
  try {
    const file = await getAssetStorage().read(String(asset.storage_location));
    return new Response(file, { headers: { "Content-Type": String(asset.mime_type ?? "video/mp4"), "Content-Length": String(file.length), "Cache-Control": "private, max-age=60", "Accept-Ranges": "bytes" } });
  } catch { return new Response("Asset unavailable", { status: 404 }); }
}
