import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';

const STATUS_LIST = [
  'Нове',
  'В обробці',
  'Відправлено',
  'Отримано',
  'Відмова',
  'Скасовано',
];

const PAY_METHODS = ['Післяплата', 'Оплата по реквізитам'];

function fmtMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₴';
}

function byCreatedDesc(a, b) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

/**
 * Групуємо рядки orders за order_no, бо в тебе замовлення можуть містити кілька позицій (кожна — рядок у orders)
 */
function groupByOrderNo(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = r.order_no ?? r.id; // fallback
    if (!map.has(key)) {
      map.set(key, {
        header: {
          order_no: key,
          created_at: r.created_at,
          email: r.email ?? r.user_email ?? '',
          status: r.status,
          payment_method: r.payment_method,
          ttn: r.ttn ?? '',
          user_id: r.user_id,
        },
        items: [],
      });
    }
    map.get(key).items.push(r);
  }
  return Array.from(map.values()).sort((a, b) =>
    byCreatedDesc({ created_at: a.header.created_at }, { created_at: b.header.created_at })
  );
}

export default function AdminOrders() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emailFilter, setEmailFilter] = useState('');

  const grouped = useMemo(() => groupByOrderNo(rows), [rows]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let q = supabase
        .from('orders')
        .select(
          `
          id, created_at, order_no, user_id,
          email, recipient_name, recipient_phone, settlement, nova_poshta_branch, shipping_address,
          status, payment_method, ttn,
          product_id, qty, my_price, price, price_dropship, image_url, name,
          payout_total, payout_paid
        `
        );

      if (emailFilter?.trim()) {
        // частковий пошук
        q = q.ilike('email', `%${emailFilter.trim()}%`);
      }

      const { data, error } = await q.order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error(e);
      alert('Помилка завантаження замовлень');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function updateRow(id, patch) {
    const { error } = await supabase.from('orders').update(patch).eq('id', id);
    if (error) {
      console.error(error);
      alert('Не вдалося зберегти зміни');
    }
  }

  async function updateOrderHeader(order, patch) {
    // застосовуємо патч одразу до всіх рядків із цим order_no
    const ids = order.items.map((i) => i.id);
    const { error } = await supabase.from('orders').update(patch).in('id', ids);
    if (error) {
      console.error(error);
      alert('Не вдалося зберегти зміни');
    } else {
      fetchOrders();
    }
  }

  async function markAllPaid(order) {
    const ids = order.items.map((i) => i.id);
    const { error } = await supabase.from('orders').update({ payout_paid: true }).in('id', ids);
    if (error) {
      console.error(error);
      alert('Не вдалося позначити як виплачені');
    } else {
      fetchOrders();
    }
  }

  return (
    <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>Замовлення (адмін)</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder="Email"
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #ddd',
            minWidth: 280,
          }}
        />
        <button
          onClick={fetchOrders}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: '#1f6feb',
            color: '#fff',
            border: 'none',
          }}
        >
          Показати
        </button>
        <button
          onClick={() => {
            setEmailFilter('');
            fetchOrders();
          }}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            background: '#e5e7eb',
            border: '1px solid #d1d5db',
          }}
        >
          Скинути
        </button>
      </div>

      {loading && <div>Завантаження…</div>}

      {!loading &&
        grouped.map((order) => {
          const sumPayout = order.items.reduce((s, it) => s + Number(it.payout_total || 0), 0);

          return (
            <div
              key={order.header.order_no + '-' + order.header.created_at}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                background: '#fff',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    №{' '}
                    <strong>
                      {order.header.order_no ?? '-'}{' '}
                    </strong>{' '}
                    •{' '}
                    <span title={order.header.created_at}>
                      {new Date(order.header.created_at).toLocaleString('uk-UA')}
                    </span>{' '}
                    • Email:{' '}
                    <span style={{ fontWeight: 600 }}>{order.header.email || '—'}</span>
                  </div>

                  {/* Статус */}
                  <div>
                    <select
                      value={order.items[0].status || ''}
                      onChange={(e) =>
                        updateOrderHeader(order, { status: e.target.value })
                      }
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                      }}
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Спосіб оплати */}
                  <div>
                    <select
                      value={order.items[0].payment_method || PAY_METHODS[0]}
                      onChange={(e) =>
                        updateOrderHeader(order, { payment_method: e.target.value })
                      }
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                      }}
                    >
                      {PAY_METHODS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* TTN */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span>ТТН:</span>
                    <input
                      defaultValue={order.items[0].ttn || ''}
                      onBlur={(e) => updateOrderHeader(order, { ttn: e.target.value })}
                      placeholder="Введіть номер..."
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        minWidth: 220,
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => markAllPaid(order)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: '#16a34a',
                      color: '#fff',
                      border: 'none',
                      whiteSpace: 'nowrap',
                    }}
                    title="Позначити всі позиції замовлення як виплачені"
                  >
                    Виплатити все
                  </button>
                </div>
              </div>

              {/* Items */}
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                {order.items.map((it) => (
                  <div
                    key={it.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr auto',
                      gap: 12,
                      padding: 12,
                      borderRadius: 10,
                      border: '1px solid #eee',
                      background: '#fafafa',
                    }}
                  >
                    <div>
                      {it.image_url ? (
                        <img
                          src={it.image_url}
                          alt=""
                          style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 80,
                            height: 60,
                            borderRadius: 8,
                            background: '#e5e7eb',
                          }}
                        />
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: 4 }}>
                      <div style={{ fontWeight: 600 }}>
                        {it.name || 'Товар'} {it.sku ? `(${it.sku})` : ''}
                      </div>
                      <div style={{ color: '#6b7280' }}>
                        К-ть: {it.qty ?? 1} • Ціна/шт: {fmtMoney(it.my_price ?? it.price ?? 0)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>До виплати</div>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={String(it.payout_total ?? 0)}
                        onBlur={(e) =>
                          updateRow(it.id, { payout_total: Number(e.target.value || 0) })
                        }
                        style={{
                          width: 120,
                          padding: '6px 8px',
                          borderRadius: 8,
                          border: '1px solid #d1d5db',
                          textAlign: 'right',
                        }}
                      />
                      <div style={{ marginTop: 6 }}>
                        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            checked={!!it.payout_paid}
                            onChange={async (e) => {
                              await updateRow(it.id, { payout_paid: e.target.checked });
                              fetchOrders();
                            }}
                          />
                          <span>Виплачено</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer total */}
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  justifyContent: 'flex-end',
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                Разом до виплати: {fmtMoney(sumPayout)}
              </div>
            </div>
          );
        })}
    </div>
  );
}
