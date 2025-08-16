import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

// Мапа статусів (онови під свої значення за потреби)
const STATUS_MAP = {
  received: "Отримано",
  refused: "Відмова",
  canceled: "Скасовано",
  paidout: "Виплачено",
};

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState({});
  const [profiles, setProfiles] = useState({}); // user_id -> email
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      // 1) всі рядки orders (останні спочатку)
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, order_no, user_id, product_id, qty, my_price, status, payment_method, created_at, recipient_name, recipient_phone, settlement, nova_poshta_branch, comment, ttn"
        )
        .order("order_no", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        alert("Помилка завантаження замовлень");
        setRows([]);
        setProducts({});
        setProfiles({});
        setLoading(false);
        return;
      }

      setRows(orders || []);

      // 2) продукти
      const pids = Array.from(new Set((orders || []).map((r) => r.product_id))).filter(Boolean);
      if (pids.length) {
        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select("id, name, image_url, price_dropship")
          .in("id", pids);

        if (pErr) {
          console.error(pErr);
          setProducts({});
        } else {
          const m = {};
          prods.forEach((p) => (m[p.id] = p));
          setProducts(m);
        }
      } else {
        setProducts({});
      }

      // 3) профілі для email (припускаю, що є таблиця profiles з user_id + email).
      // Якщо в тебе інша таблиця/в’ю — заміни назву і поле email нижче.
      const uids = Array.from(new Set((orders || []).map((r) => r.user_id))).filter(Boolean);
      if (uids.length) {
        const { data: profs, error: sErr } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", uids);
        if (sErr) {
          console.error(sErr);
          setProfiles({});
        } else {
          const m = {};
          profs.forEach((p) => (m[p.id] = p.email));
          setProfiles(m);
        }
      } else {
        setProfiles({});
      }

      setLoading(false);
    })();

    return () => (mounted = false);
  }, []);

  // розрахунок виплати по рядку
  const rowPay = (r) => {
    const p = products[r.product_id];
    const qty = Number(r.qty || 1);
    const sale = Number(r.my_price || 0);
    const drop = Number(p?.price_dropship || 0);

    const base = r.payment_method === "cod" ? (sale - drop) * qty : 0;

    if (r.status === "canceled") return 0;
    if (r.status === "paidout") return 0;
    if (r.status === "refused") return 0;
    if (r.status === "received") return base;

    return 0;
  };

  // фільтр по email (кейс-інсенситив)
  const filtered = useMemo(() => {
    const norm = email.trim().toLowerCase();
    if (!norm) return rows;
    return rows.filter((r) => (profiles[r.user_id] || "").toLowerCase().includes(norm));
  }, [rows, profiles, email]);

  // групування по order_no
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      if (!map.has(r.order_no)) map.set(r.order_no, []);
      map.get(r.order_no).push(r);
    }
    return Array.from(map.entries()).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filtered]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-4">Замовлення (адмін)</h1>

      <div className="mb-4 flex items-center gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-80 rounded-md border border-slate-300 px-3 py-2"
        />
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          onClick={() => setEmail(email.trim())}
        >
          Показати
        </button>
        <button
          className="rounded-md border px-4 py-2 hover:bg-slate-50"
          onClick={() => setEmail("")}
        >
          Скинути
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Завантаження…</p>
      ) : !rows.length ? (
        <p className="text-slate-500">Замовлень ще немає.</p>
      ) : (
        <div className="space-y-6">
          {grouped.map(([orderNo, lines]) => {
            const total = lines.reduce((s, r) => s + rowPay(r), 0);
            const first = lines[0];
            const emailShown = profiles[first.user_id] || "—";

            return (
              <div key={orderNo} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold">№ {orderNo}</div>
                  <div className="mx-2">•</div>
                  <div>{new Date(first.created_at).toLocaleString("uk-UA")}</div>
                  <div className="mx-2">•</div>
                  <div>Email: {emailShown}</div>
                  <div className="mx-2">•</div>
                  <div className="rounded bg-slate-100 px-2 py-0.5">
                    {STATUS_MAP[first.status] ?? first.status}
                  </div>
                  <div className="mx-2">•</div>
                  <div className="rounded bg-slate-100 px-2 py-0.5">
                    Оплата: {first.payment_method === "cod" ? "Післяплата" : "Оплата по реквізитам"}
                  </div>
                  {first.ttn ? (
                    <>
                      <div className="mx-2">•</div>
                      <div>ТТН: {first.ttn}</div>
                    </>
                  ) : null}
                  <div className="ml-auto text-slate-900">
                    Разом до виплати:{" "}
                    <span className="font-semibold">
                      {total.toLocaleString("uk-UA", {
                        style: "currency",
                        currency: "UAH",
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {lines.map((r) => {
                    const p = products[r.product_id];
                    const itemPay = rowPay(r);
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-4 py-3">
                        <img
                          src={p?.image_url || "/placeholder.png"}
                          alt={p?.name || "Товар"}
                          className="h-16 w-16 rounded-md object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium line-clamp-1">{p?.name || "Товар"}</div>
                          <div className="text-sm text-slate-600">
                            К-ть: {r.qty || 1} • Ціна/шт:{" "}
                            {Number(r.my_price || 0).toLocaleString("uk-UA")} ₴
                          </div>
                          <div className="text-sm text-slate-600">
                            Одержувач: {r.recipient_name || "—"} • {r.recipient_phone || "—"} •{" "}
                            {r.settlement || "—"} • Відділення: {r.nova_poshta_branch || "—"}
                          </div>
                          {r.comment ? (
                            <div className="text-sm text-slate-600">Коментар: {r.comment}</div>
                          ) : null}
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-slate-600">До виплати</div>
                          <div className="text-lg font-semibold">
                            {itemPay.toLocaleString("uk-UA", {
                              style: "currency",
                              currency: "UAH",
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
