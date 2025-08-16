import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

// Які саме рядки статусів відповідають твоїм селектам у БД.
// За потреби підкоригуй під свої реальні значення.
const STATUS_MAP = {
  received: "Отримано",
  refused: "Відмова",
  canceled: "Скасовано",
  paidout: "Виплачено",
  // решта статусів (new/in_progress/ordered/shipped) просто показуємо,
  // але у баланс не додаємо до моменту "Отримано"
};

export default function Dashboard() {
  const [rows, setRows] = useState([]);      // сирі рядки orders
  const [products, setProducts] = useState({}); // map product_id -> product
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const { data: sess } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(sess?.session || null);

      // 1) тягнемо ВСІ замовлення користувача (по одному товару в рядку)
      const userId = sess?.session?.user?.id ?? "00000000-0000-0000-0000-000000000000";
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "id, order_no, user_id, product_id, qty, my_price, status, payment_method, created_at, ttn, recipient_name, recipient_phone, settlement, nova_poshta_branch, comment"
        )
        .eq("user_id", userId)
        .order("order_no", { ascending: false })
        .order("created_at", { ascending: true });

      if (error) {
        console.error(error);
        alert("Помилка завантаження замовлень");
        setRows([]);
        setProducts({});
        setLoading(false);
        return;
      }

      if (!orders?.length) {
        setRows([]);
        setProducts({});
        setLoading(false);
        return;
      }

      setRows(orders);

      // 2) одним махом тягнемо потрібні продукти
      const ids = Array.from(new Set(orders.map((r) => r.product_id))).filter(Boolean);
      if (ids.length) {
        const { data: prods, error: pErr } = await supabase
          .from("products")
          .select("id, name, image_url, price_dropship")
          .in("id", ids);

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

      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // підрахунок виплати по ОДНОМУ рядку orders
  const rowPay = (r) => {
    const p = products[r.product_id];
    const qty = Number(r.qty || 1);
    const sale = Number(r.my_price || 0);
    const drop = Number(p?.price_dropship || 0);

    // лише післяплата дає виплату; оплата по реквізитам — 0
    const base = r.payment_method === "cod" ? (sale - drop) * qty : 0;

    // статуси:
    if (r.status === "canceled") return 0;
    if (r.status === "paidout") return 0;
    if (r.status === "refused") return 0; // відмову вводите від’ємною сумою вручну в адмінці
    if (r.status === "received") return base;

    // нове/в обробці/замовлено/відправлено — ще не враховуємо
    return 0;
  };

  // Баланс для шапки — сума по всіх рядках
  const balance = useMemo(
    () => rows.reduce((acc, r) => acc + rowPay(r), 0),
    [rows, products]
  );

  // групуємо рядки по номеру замовлення (order_no) для відображення як у тебе
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      if (!map.has(r.order_no)) map.set(r.order_no, []);
      map.get(r.order_no).push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => Number(b[0]) - Number(a[0])); // нові зверху
  }, [rows]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Мої замовлення</h1>
        <div className="text-lg">
          Сума до виплати:{" "}
          <span className="font-semibold">
            {balance.toLocaleString("uk-UA", {
              style: "currency",
              currency: "UAH",
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-slate-500">Завантаження...</p>
      ) : !rows.length ? (
        <p className="mt-6 text-slate-500">Замовлень ще немає.</p>
      ) : (
        <div className="mt-6 space-y-6">
          {grouped.map(([orderNo, lines]) => {
            const total = lines.reduce((s, r) => s + rowPay(r), 0);
            return (
              <div
                key={orderNo}
                className="rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm text-slate-600">
                  <div className="font-semibold">№ {orderNo}</div>
                  <div className="mx-2">•</div>
                  <div>
                    {new Date(lines[0].created_at).toLocaleString("uk-UA")}
                  </div>
                  <div className="mx-2">•</div>
                  <div className="rounded bg-slate-100 px-2 py-0.5">
                    {STATUS_MAP[lines[0].status] ?? lines[0].status}
                  </div>
                  <div className="mx-2">•</div>
                  <div className="rounded bg-slate-100 px-2 py-0.5">
                    Оплата:{" "}
                    {lines[0].payment_method === "cod"
                      ? "Післяплата"
                      : "Оплата по реквізитам"}
                  </div>
                  {lines[0].ttn ? (
                    <>
                      <div className="mx-2">•</div>
                      <div>ТТН: {lines[0].ttn}</div>
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
                      <div
                        key={r.id}
                        className="flex items-center gap-4 px-4 py-3"
                      >
                        <img
                          src={p?.image_url || "/placeholder.png"}
                          alt={p?.name || "Товар"}
                          className="h-16 w-16 rounded-md object-cover border"
                        />
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${p?.id || r.product_id}`}
                            className="font-medium hover:underline line-clamp-1"
                          >
                            {p?.name || "Товар"}
                          </Link>
                          <div className="text-sm text-slate-600">
                            К-ть: {r.qty || 1} • Ціна/шт:{" "}
                            {Number(r.my_price || 0).toLocaleString("uk-UA")} ₴
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-slate-600">
                            До виплати
                          </div>
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
