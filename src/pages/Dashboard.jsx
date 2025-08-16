import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [sum, setSum] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const {
        data: { user },
        error: uErr,
      } = await supabase.auth.getUser();

      if (uErr || !user) {
        if (!cancelled) {
          setSum(0);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('orders')
        .select('payout_total')
        .eq('user_id', user.id)
        .eq('payout_paid', false);

      if (error) {
        console.error('orders sum error:', error);
        if (!cancelled) {
          setSum(0);
          setLoading(false);
        }
        return;
      }

      const total = (data || []).reduce(
        (acc, r) => acc + Number(r?.payout_total ?? 0),
        0
      );

      if (!cancelled) {
        setSum(total);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Мої замовлення</h1>

      <div className="flex justify-end">
        <div className="text-lg">
          Сума до виплати:{' '}
          <b>
            {loading ? '—' : sum.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            ₴
          </b>
        </div>
      </div>
    </div>
  );
}
