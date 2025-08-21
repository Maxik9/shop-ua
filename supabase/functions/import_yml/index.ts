import { runImport } from "./index.impl.ts";

const REQUIRED_SECRET = Deno.env.get("IMPORT_SECRET");

function jsonReply(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization,content-type,x-import-token",
      "access-control-allow-methods": "POST,OPTIONS"
    }
  });
}

const RATE = new Map<string, { count: number; ts: number }>();
function rateLimitOk(ip: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  const stat = RATE.get(ip) || { count: 0, ts: now };
  if (now - stat.ts > windowMs) { stat.count = 0; stat.ts = now; }
  stat.count += 1;
  RATE.set(ip, stat);
  return stat.count <= limit;
}

async function securityGate(req: Request): Promise<Response | null> {
  if (req.method === "OPTIONS") return jsonReply(204, {});
  if (req.method !== "POST") return jsonReply(405, { ok: false, error: "Only POST is allowed" });

  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimitOk(ip)) return jsonReply(429, { ok: false, error: "Rate limit exceeded" });

  if (!REQUIRED_SECRET || REQUIRED_SECRET.trim() === "") {
    return jsonReply(500, { ok: false, error: "IMPORT_SECRET is not set on the function" });
  }

  const token = req.headers.get("x-import-token") ?? "";
  if (token !== REQUIRED_SECRET) {
    return jsonReply(401, { ok: false, error: "Invalid or missing x-import-token" });
  }

  const maxBytes = Number(Deno.env.get("MAX_BODY_BYTES") ?? "20000000");
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) return jsonReply(413, { ok: false, error: "Payload too large" });

  const allowed = (Deno.env.get("ALLOWED_FEED_HOSTS") ?? "")
    .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length > 0) {
    try {
      const clone = req.clone();
      const body = await clone.json().catch(() => ({} as any));
      if (body?.url) {
        const u = new URL(body.url);
        if (!allowed.includes(u.hostname.toLowerCase())) {
          return jsonReply(400, { ok: false, error: "Feed host is not allowed", host: u.hostname });
        }
      }
    } catch {}
  }
  return null;
}

Deno.serve(async (req: Request) => {
  const blocked = await securityGate(req);
  if (blocked) return blocked;

  try {
    return await runImport(req);
  } catch (e) {
    console.error("runImport failed:", e);
    return jsonReply(500, { ok: false, error: e?.message ?? "Unhandled error" });
  }
});
