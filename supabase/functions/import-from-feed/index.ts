import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.3-alpha/deno-dom-wasm.ts'
import { parse as parseXml } from 'https://deno.land/x/xml@2.1.3/mod.ts'

Deno.serve(async (req) => {
  try {
    // 1. Отримуємо URL з запиту або з змінних середовища (для авто-оновлення)
    const { url: bodyUrl } = await req.json().catch(() => ({ url: null }))
    const importUrl = bodyUrl || Deno.env.get('PRODUCTS_FEED_URL')
    
    if (!importUrl) {
      return new Response(JSON.stringify({ error: 'URL for feed is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      SUPABASE_SERVICE_ROLE_KEY,
    )

    // 2. Завантажуємо XML-файл
    const response = await fetch(importUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch XML from ${importUrl}, status: ${response.status}`)
    }
    const xmlText = await response.text()
    
    // 3. Парсимо XML
    const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
    if (!doc) throw new Error('Failed to parse XML')

    const products = []
    const offers = doc.querySelectorAll('offer') // Шукаємо всі теги <offer>

    for (const offer of offers) {
      const sku = offer.getAttribute('id')
      const name = offer.querySelector('name')?.textContent
      const priceDropship = Number(offer.querySelector('price')?.textContent)
      const inStock = offer.getAttribute('available') === 'true'
      const description = offer.querySelector('description')?.textContent
      
      const pictures = offer.querySelectorAll('picture')
      const imageUrl = pictures[0]?.textContent || null
      const gallery = pictures.length > 1 ? Array.from(pictures).slice(1).map(p => p.textContent) : []

      if (sku && name) {
        products.push({
          sku,
          name,
          price_dropship: priceDropship,
          in_stock: inStock,
          description,
          image_url: imageUrl,
          gallery_json: gallery,
          // category_id та інші поля можна додати за потреби
        })
      }
    }

    if (products.length === 0) {
      return new Response(JSON.stringify({ message: 'No products found in the feed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // 4. Оновлюємо базу даних (upsert)
    const { error } = await supabase.from('products').upsert(products, {
      onConflict: 'sku',
      ignoreDuplicates: false,
    })

    if (error) throw error

    return new Response(JSON.stringify({ message: `Successfully imported/updated ${products.length} products.` }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})