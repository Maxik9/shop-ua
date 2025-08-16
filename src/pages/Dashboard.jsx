import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseClient";

const CURRENCY = new Intl.NumberFormat("uk-UA", {
  style: "currency",
  currency: "UAH",
  maximumFractionDigits: 2,
});

const STATUS_PAID_OUT = "виплачено";

function money(n) {
  const x = Number(n || 0);
  return CURRENCY.format(isFinite(x) ? x : 0);
}

/**
 * Обчислюємо payout по замовленню:
 * 1) якщо є payout_total в БД — беремо його
 * 2) інакше:
 *    - для післяплати (payment_method === 'cod'): (my_price - price_dropship) * qty
 *    - для оплати по реквізитам (payment_method === 'bank'): 0
 * Зміна поточної ціни товару на історичні розрахунки не впливає.
 */
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

export default function Dashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      // тягнемо замовлення юзера + дані товару для фото/назви/дроп-ціни
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            id, order_no, created_at, status, ttn,
            payment_method, qty, my_price, comment,
            product_id,
            products:id_product (id, name, image_url, price_dropship)
          `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (error) {
        console.error(error);
        setOrders([]);
      } else {
        // вирівнюємо поле products (через alias id_product в select)
        const normalized =
          data?.map((o) => ({
            ...o,
            products: o["products"] || o["id_product"] || null,
          })) || [];
        setOrders(normalized);
      }
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Баланс: сума payout по замовленнях, що НЕ "виплачено"
  const balance = useMemo(() => {
    return orders
      .filter((o) => (o.status || "").toLowerCase() !== STATUS_PAID_OUT)
      .reduce((sum, o) => sum + calcPayout(o), 0);
  }, [orders]);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Мої замовлення</h1>
        <div className="text-lg">
          Сума до виплати:&nbsp;
          <span className="font-semibold">{money(balance)}</span>
        </div>
      </div>

      {loading ? (
        <p>Завантаження…</p>
      ) : orders.length === 0 ? (
        <p>Замовлень ще немає.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((o) => {
            const p = o.products || {};
            const payout = calcPayout(o);

            return (
              <div
                key={o.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    № <span className="font-medium">{o.order_no}</span>
                    <span className="mx-2">•</span>
                    {new Date(o.created_at).toLocaleString("uk-UA")}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium">
                      {(o.status || "").charAt(0).toUpperCase() +
                        (o.status || "").slice(1)}
                    </span>
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                      Оплата: {o.payment_method === "bank" ? "Реквізити" : "Післяплата"}
                    </span>
                    <span className="text-gray-400">ТТН: {o.ttn || "—"}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-4">
                  <img
                    src={p?.image_url || "/placeholder.png"}
                    alt={p?.name || "product"}
                    className="h-20 w-20 rounded-lg object-cover ring-1 ring-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${p?.id || o.product_id}`}
                      className="font-medium hover:underline"
                    >
                      {p?.name || "Товар"}
                    </Link>
                    <div className="mt-1 text-sm text-gray-600">
                      К-ть: {o.qty || 1} • Ціна/шт: {money(o.my_price)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm text-gray-500">До виплати</div>
                    <div className="text-lg font-semibold">{money(payout)}</div>
                  </div>
                </div>

                <div className="mt-4 text-right">
                  <span className="text-sm text-gray-500">Разом до виплати: </span>
                  <span className="text-lg font-bold">{money(payout)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
