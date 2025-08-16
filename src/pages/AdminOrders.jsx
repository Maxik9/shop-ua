import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminOrders() {
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const balance = useMemo(
    () => orders.reduce((a, r) => a + Number(r?.payout_total ?? 0), 0),
    [orders]
  );

  async function ensureAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Не авторизовано');

    // читання довільного замовлення адміну дозволено вашими RLS:
    // policy "Admins can do anything with orders" (ALL) is_admin(auth.uid())
    // Якщо у вас інша логіка визначення адміна — залишилась як була.
  }

  async function load() {
    setLoading(true);
    try {
      await ensureAdmin();

      let query = supabase
        .from('orders')
        .select('id, created_at, email, status, payment_method, payout_total, payout_paid, order_no, ttn')
        .order('created_at', { ascending: false })
        .limit(200);

      if (email.trim()) {
        query = query.ilike('email', email.trim());
      }

      const { data, error } = await query;
      if (error) throw error;

      setOrders(data || []);
    } catch (e) {
      console.error(e);
      alert('Помилка завантаження замовлень');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function savePayoutTotal(id, value) {
    const num = Number(value ?? 0);
    const { error } = await supabase.from('orders').update({ payout_total: num }).eq('id', id);
    if (error) {
      console.error(error);
      alert('Не вдалося зберегти суму');
      return;
    }
    setOrders((prev) => prev.map((r) => (r.id === id ? { ...r, payout_total: num } : r)));
  }

  async function markPaid(id, paid) {
    const { error } = await supabase.from('orders').update({ payout_paid: paid }).eq('id', id);
    if (error) {
      console.error(error);
      alert('Не вдалося змінити статус виплати');
      return;
    }
    setOrders((prev) => prev.map((r) => (r.id === id ? { ...r, payout_paid: paid } : r)));
  }

  async function markAllFilteredPaid() {
    if (!orders.length) return;
    if (!confirm('Позначити всі відфільтровані як виплачені?')) return;

    const ids = orders.map((o) => o.id);
    const { error } = await supabase.from('orders').update({ payout_paid: true }).in('id', ids);
    if (error) {
      console.error(error);
      alert('Не вдалося виконати операцію');
      return;
    }
    setOrders((prev) => prev.map((r) => ({ ...r, payout_paid: true })));
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Замовлення (адмін)</h1>

      <div className="flex gap-3 items-center mb-4">
        <input
          className="border rounded px-3 py-2 w-80"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn btn-primary" onClick={load} disabled={loading}>
          Показати
        </button>
        <button className="btn" onClick={() => { setEmail(''); load(); }} disabled={loading}>
          Скинути
        </button>

        <div className="ml-auto">
          Баланс по фільтру:{' '}
          <b>
            {balance.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
          </b>
        </div>
      </div>

      {loading && <div>Завантаження…</div>}

      {!loading && !orders.length && <div>Немає записів</div>}

      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="border rounded p-3">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="text-sm text-gray-500">
                  № {o.order_no ?? o.id} • {new Date(o.created_at).toLocaleString('uk-UA')}
                </div>
                <div className="text-sm">Email: {o.email || '—'}</div>
                <div className="text-sm">Статус: {o.status || '—'}</div>
                <div className="text-sm">Оплата: {o.payment_method || '—'}</div>
                <div className="text-sm">ТТН: {o.ttn || '—'}</div>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm">Разом до виплати:</span>
                  <input
                    type="number"
                    step="0.01"
                    className="border rounded px-2 py-1 w-32"
                    defaultValue={Number(o.payout_total ?? 0)}
                    onBlur={(e) => savePayoutTotal(o.id, e.target.value)}
                  />
                  <button
                    className={`px-3 py-1 rounded ${o.payout_paid ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
                    onClick={() => markPaid(o.id, !o.payout_paid)}
                    title={o.payout_paid ? 'Виплачено' : 'Позначити як виплачено'}
                  >
                    {o.payout_paid ? 'Виплачено' : 'Позначити виплачено'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button className="btn btn-primary" onClick={markAllFilteredPaid}>
            Позначити всі відфільтровані як виплачені
          </button>
        </div>
      )}
    </div>
  );
}
