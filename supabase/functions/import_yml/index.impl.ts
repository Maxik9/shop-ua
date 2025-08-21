export async function runImport(req: Request): Promise<Response> {
  // TODO: встав свій імпорт-код тут і поверни Response
  return new Response(JSON.stringify({ ok: false, error: "Not implemented: put your import logic into runImport(req)" }), {
    status: 500,
    headers: { "content-type": "application/json" }
  });
}
