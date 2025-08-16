import React, { useEffect, useMemo, useState } from 'react';
import supabase from '../supabaseClient';

function fmtMoney(n) {
  const num = Number(n || 0);
  return num.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₴';
}

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadUser() {
    const { data, error } = await supabase.auth.getUser();
    if (!error) setUser(data.user ?? null);
  }

  async function fetchMyOrders(uid) {
    if (!uid) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          id, created_at, order_no, status, payment_method, ttn,
          qty, my_price, name, image_url,
          payout_total, payout_paid
        `
        )
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.id) fetchMyOrders(user.id);
  }, [user?.id]);

  const unpaidSum = useMemo(
    () => rows.filter((r) => !r.payout_paid).reduce((s, r) => s + Number(r.payout_total || 0), 0),
    [rows]
  );

  return (
    <div className="container" style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Мої замовлення</h1>
        <div style={{ fontSize: 18 }}>
          <span style={{ opacity: 0.7, marginRight: 8 }}>Сума до виплати:</span>
          <strong style={{ fontSize: 22 }}>{fmtMoney(unpaidSum)}</strong>
        </div>
      </div>

      {loading && <div style={{ marginTop: 12 }}>Завантаження…</div>}

      {!loading &&
        rows.map((r) => (
          <div
            key={r.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
              background: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
              }}
            >
              <div>
                № <strong>{r.order_no ?? '-'}</strong> •{' '}
                <span title={r.created_at}>{new Date(r.created_at).toLocaleString('uk-UA')}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: '#eef2ff',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  {r.status || '—'}
                </span>
                <span
                  style={{
                    padding: '6px 10px',
                    borderRadius: 8,
                    background: '#f1f5f9',
                    border: '1px solid #e5e7eb',
                  }}
                >
                  Оплата: {r.payment_method || '—'}
                </span>
                <span>ТТН: {r.ttn || '—'}</span>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: '80px 1fr auto',
                gap: 12,
              }}
            >
              <div>
                {r.image_url ? (
                  <img
                    src={r.image_url}
                    alt=""
                    style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 8 }}
                  />
                ) : (
                  <div style={{ width: 80, height: 60, borderRadius: 8, background: '#e5e7eb' }} />
                )}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{r.name || 'Товар'}</div>
                <div style={{ color: '#6b7280' }}>
                  К-ть: {r.qty ?? 1} • Ціна/шт: {fmtMoney(r.my_price ?? 0)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>До виплати</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>{fmtMoney(r.payout_total || 0)}</div>
                {r.payout_paid && (
                  <div style={{ marginTop: 4, fontSize: 12, color: '#16a34a' }}>Виплачено</div>
                )}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}
