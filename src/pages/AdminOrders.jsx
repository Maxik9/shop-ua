import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

const CURRENCY = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 2,
});

const STATUSES = [
  "нове",
  "в обробці",
  "відправлено",
  "отримано",
  "відмова",
  "скасовано",
  "виплачено",
];

function money(n) {
  const x = Number(n || 0);
  return CURRENCY.format(isFinite(x) ? x : 0);
}

function calcPayout(order) {
  if (order?.payout_total !== null && order?.payout_total !== undefined) {
    return Number(order.payout_total) || 0;
  }
  const method = order?.payment_method || "cod";
  const qty = Number(order?.qty || 1);
  const sell = Number(order?.my_price || 0);
  const drop =
    Number(order?.products?.price_dropship || order?.drop_price_at_order || 0);
  if (method === "bank") return 0;
  const diff = sell - drop;
  return qty * (isFinite(diff) ? diff : 0);
}

export default function AdminOrders() {
  const [email, setEmail] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState({}); // {orderId: value}

  const filteredBalance = useMemo(() => {
    return orders
      .filter((o) => (o.status || "").toLowerCase() !== "виплачено")
      .reduce((sum, o) => sum + calcPayout(o), 0);
  }, [orders]);

  async function load() {
    setLoading(true);

    let query = supabase
      .from("orders")
      .select(
        `
        id, order_no, created_at, status, ttn,
        payment_method, qty, my_price, recipient_name, recipient_phone,
        settlement, nova_poshta_branch, comment,
        user_id, payout_total,
        product_id,
        products:id_product (id, name, image_url, price_dropship),
        profiles:user_id (email)
      `
      )
      .order("created_at", { ascending: false });

    if (email.trim()) {
      query = query.ilike("profiles.email", email.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      alert("Помилка завантаження замовлень");
      setOrders([]);
    } else {
      const normalized =
        data?.map((o) => ({
          ...o,
          products: o["products"] || o["id_product"] || null,
          user_email: o["profiles"]?.email || "",
        })) || [];
      setOrders(normalized);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateOrder(id, patch) {
    const { error } = await supabase.from("orders").update(patch).eq("id", id);
    if (error) {
      console.error(error);
      alert("Не вдалося зберегти зміни");
      return false;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    return true;
  }

  function startEdit(o) {
    setEditing((e) => ({ ...e, [o.id]: String(calcPayout(o)) }));
  }
  function cancelEdit(id) {
    setEditing((e) => {
      const x = { ...e };
      delete x[id];
      return x;
    });
  }
  async function saveEdit(o) {
    const raw = editing[o.id];
    const val = Number(raw);
    if (!isFinite(val)) {
      alert("Введіть коректне число");
      return;
    }
    const ok = await updateOrder(o.id, { payout_total: val });
    if (ok) cancelEdit(o.id);
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Замовлення (адмін)</h1>

        <div className="flex items-center gap-2">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-64 rounded-lg border px-3 py-2"
          />
          <button
            onClick={load}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Показати
          </button>
          <button
            onClick={() => {
              setEmail("");
              load();
            }}
            className="rounded-lg border px-4 py-2"
          >
            Скинути
          </button>
        </div>
      </div>

      {email.trim() && (
        <div className="mb-4 text-right text-lg">
          До виплати для <span className="font-medium">{email.trim()}</span>:{" "}
          <span className="font-semibold">{money(filteredBalance)}</span>
        </div>
      )}

      {loading ? (
        <p>Завантаження…</p>
      ) : orders.length === 0 ? (
        <p>Нічого не знайдено.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((o) => {
            const p = o.products || {};
            const payout = calcPayout(o);
            const isEdit = editing[o.id] !== undefined;

            return (
              <div
                key={o.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    № <span className="font-medium">{o.order_no}</span>
                    <span className="mx-1">•</span>
                    {new Date(o.created_at).toLocaleString("uk-UA")}
                    <span className="mx-1">•</span>
                    <span className="text-gray-700">{o.user_email}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Статус */}
                    <select
                      className="rounded-lg border px-2 py-1 text-sm"
                      value={o.status || ""}
                      onChange={(e) =>
                        updateOrder(o.id, { status: e.target.value })
                      }
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>

                    {/* Спосіб оплати – для відображення */}
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      {o.payment_method === "bank"
                        ? "Оплата по реквізитам"
                        : "Післяплата"}
                    </span>

                    {/* TTN */}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400">ТТН:</span>
                      <input
                        value={o.ttn || ""}
                        onChange={(e) => updateOrder(o.id, { ttn: e.target.value })}
                        className="w-44 rounded-lg border px-2 py-1 text-sm"
                        placeholder="Введіть номер…"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <img
                    src={p?.image_url || "/placeholder.png"}
                    alt={p?.name || "product"}
                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{p?.name || "Товар"}</div>
                    <div className="mt-1 text-sm text-gray-600">
                      К-ть: {o.qty || 1} • Ціна/шт: {money(o.my_price)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">До виплати</div>
                    <div className="text-lg font-semibold">{money(payout)}</div>
                  </div>
                </div>

                {/* Разом до виплати: редагування */}
                <div className="mt-4 flex items-center justify-end gap-3">
                  <span className="text-sm text-gray-500">Разом до виплати:</span>

                  {isEdit ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={editing[o.id]}
                        onChange={(e) =>
                          setEditing((st) => ({ ...st, [o.id]: e.target.value }))
                        }
                        className="w-36 rounded-lg border px-2 py-1 text-right"
                      />
                      <button
                        onClick={() => saveEdit(o)}
                        className="rounded-lg bg-green-600 px-3 py-1 text-white hover:bg-green-700"
                      >
                        Зберегти
                      </button>
                      <button
                        onClick={() => cancelEdit(o.id)}
                        className="rounded-lg border px-3 py-1"
                      >
                        Скасувати
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-bold">{money(payout)}</span>
                      <button
                        onClick={() => startEdit(o)}
                        className="rounded-lg px-3 py-1 text-red-600 hover:bg-red-50"
                        title="Змінити суму"
                      >
                        Змінити суму
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
