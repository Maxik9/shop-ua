import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
  functions: {
    // Це дуже важливий рядок, він вказує на базовий URL ваших функцій
    url: 'https://oqfrhvgzwstoxabttqno.supabase.co/functions/v1',
  }
})