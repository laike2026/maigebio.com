import { query } from "@/lib/db";
import { getMedia } from "@/lib/media-storage";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const found = await query<{ object_key: string; mime_type: string }>("SELECT object_key,mime_type FROM media_assets WHERE id=$1 AND deleted_at IS NULL LIMIT 1", [id]);
  if (!found.rows[0]) return new Response("Not found", { status: 404 });
  try {
    const bytes = await getMedia(found.rows[0].object_key);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": found.rows[0].mime_type, "Content-Disposition": "inline", "Cache-Control": "public, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response("Not found", { status: 404 }); }
}
