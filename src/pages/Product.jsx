// src/pages/Product.jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()
  const nav = useNavigate()
  const { add } = useCart()

  const [product, setProduct] = useState(null)
  const [images, setImages] = useState([])
  const [index, setIndex] = useState(0)
  const startX = useRef(null)

  useEffect(() => {
    async function load() {
      // товар
      const { data: p, error: pe } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()
      if (pe) { console.warn(pe); return }
      setProduct(p)

      // додаткові зображення
      const { data: imgs, error: ie } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (ie) { console.warn(ie) }
      setImages(imgs || [])
      setIndex(0)
    }
    load()
  }, [id])

  // повна галерея: обкладинка + додаткові фото
  const gallery = useMemo(() => {
    const cover = product?.image_url ? [{ id: 'cover', url: product.image_url }] : []
    return [...cover, ...images]
  }, [product, images])

  function prev() { if (gallery.length) setIndex((v) => (v - 1 + gallery.length) % gallery.length) }
  function next() { if (gallery.length) setIndex((v) => (v + 1) % gallery.length) }
  function keyNav(e) { if (e.key === 'ArrowLeft') prev(); if (e.
