import { randomBytes } from "node:crypto";
import { can, getSession, requestOriginAllowed } from "@/lib/admin/auth";
import { modules } from "@/lib/admin/definitions";
import { createRecord, errorResponse, getRecord } from "@/lib/admin/records";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ module: string; id: string }> }) {
  const { module, id } = await context.params;
  const user = await getSession(); if (!user) return Response.json({ code: "UNAUTHENTICATED" }, { status: 401 });
  if (!can(user, module, "create")) return Response.json({ code: "FORBIDDEN" }, { status: 403 });
  if (!(await requestOriginAllowed(request))) return Response.json({ code: "BAD_ORIGIN" }, { status: 403 });
  if (!modules[module] || !["products", "news"].includes(module)) return Response.json({ code: "INVALID_MODULE" }, { status: 404 });
  try {
    const old = await getRecord(module, id);
    const suffix = randomBytes(3).toString("hex");
    const copy: Record<string, unknown> = { status: "draft", slug: `${String(old.slug).slice(0, 140)}-copy-${suffix}`, featured: false, pinned: false };
    for (const field of modules[module].fields) if (!["id", "slug", "sku", "status", "featured", "pinned", "scheduled_at"].includes(field.key) && old[field.key] !== null && old[field.key] !== undefined) copy[field.key] = old[field.key];
    if (module === "products") copy.sku = `${String(old.sku).slice(0, 120)}-COPY-${suffix.toUpperCase()}`;
    const created = await createRecord(module, copy, user);
    if (module === "products") {
      await query("INSERT INTO product_category_links(product_id,category_id) SELECT $1,category_id FROM product_category_links WHERE product_id=$2", [created.id, id]);
      await query("INSERT INTO product_media(product_id,media_id,sort_order) SELECT $1,media_id,sort_order FROM product_media WHERE product_id=$2", [created.id, id]);
      await query("INSERT INTO product_relations(product_id,related_id) SELECT $1,related_id FROM product_relations WHERE product_id=$2", [created.id, id]);
    }
    return Response.json(created, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
