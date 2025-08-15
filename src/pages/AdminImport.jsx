
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function AdminImport(){
  const [feeds, setFeeds] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [form, setForm] = useState({
    name: '',
    url: '',
    item_path: '',
    sku_path: '',
    stock_path: '',
    price_path: '',
    name_path: '',
    description_path: '',
    photo_path: '',
    enabled: true
  })

  async function load(){
    const { data, error } = await supabase.from('supplier_feeds').select('*').order('created_at', {ascending:false})
    if (error) setErr(error.message)
    else setFeeds(data||[])
  }
  useEffect(()=>{ load() }, [])

  async function addFeed(e){
    e?.preventDefault?.()
    setErr(''); setMsg('')
    if(!form.name || !form.url || !form.item_path || !form.sku_path || !form.stock_path){
      setErr('Заповни мінімум: Назва, URL, item_path, sku_path, stock_path')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('supplier_feeds').insert(form)
    if (error) setErr(error.message)
    else { setMsg('Фід додано'); setForm({name:'',url:'',item_path:'',sku_path:'',stock_path:'',price_path:'',name_path:'',description_path:'',photo_path:'',enabled:true}); await load() }
    setBusy(false)
  }

  async function toggle(feed){
    setBusy(true); setErr(''); setMsg('')
    const { error } = await supabase.from('supplier_feeds').update({ enabled: !feed.enabled }).eq('id', feed.id)
    if (error) setErr(error.message); else { await load(); setMsg('Оновлено') }
    setBusy(false)
  }

  async function removeFeed(feed){
    if (!confirm('Видалити фід?')) return
    setBusy(true); setErr(''); setMsg('')
    const { error } = await supabase.from('supplier_feeds').delete().eq('id', feed.id)
    if (error) setErr(error.message); else { await load(); setMsg('Видалено') }
    setBusy(false)
  }

  async function run(feed, op){
    setBusy(true); setErr(''); setMsg(op==='full_import'?'Повний імпорт…':'Оновлення наявності…')
    const { data, error } = await supabase.functions.invoke('feeds_refresh', { body: { feed_id: feed.id, op } })
    if (error) setErr(error.message)
    else setMsg(`OK: ${data?.updated ?? 0}`)
    setBusy(false); await load()
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Імпорт (XML/УМЛ)</h1>
        <Link to="/admin" className="btn-ghost">← До адмінки</Link>
      </div>

      {err && <div className="text-red-600 mb-3">{err}</div>}
      {msg && <div className="text-green-700 mb-3">{msg}</div>}

      <div className="card mb-6">
        <div className="card-body">
          <h3 className="font-semibold mb-2">Новий фід</h3>
          <form onSubmit={addFeed} className="grid md:grid-cols-2 gap-3">
            {['name','url','item_path','sku_path','stock_path','price_path','name_path','description_path','photo_path'].map(k=>(
              <label key={k} className="flex flex-col gap-1">
                <span className="text-sm">{k}</span>
                <input className="input" value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={k} />
              </label>
            ))}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.enabled} onChange={e=>setForm({...form,enabled:e.target.checked})}/>
              <span className="text-sm">enabled</span>
            </label>
            <div><button className="btn-primary" disabled={busy} type="submit">Додати</button></div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body overflow-x-auto">
          <h3 className="font-semibold mb-2">Фіди</h3>
          <table className="table">
            <thead><tr><th>Назва</th><th>URL</th><th>Paths</th><th>Статус</th><th>Дії</th></tr></thead>
            <tbody>
              {feeds.map(f=>(
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td className="max-w-[320px] text-xs break-all">{f.url}</td>
                  <td className="text-xs">
                    item:{' '}{f.item_path}<br/>
                    sku:{' '}{f.sku_path} | stock:{' '}{f.stock_path} | price:{' '}{f.price_path || '-'}<br/>
                    name:{' '}{f.name_path || '-'} | desc:{' '}{f.description_path || '-'} | photo:{' '}{f.photo_path || '-'}
                  </td>
                  <td className="text-xs">
                    {f.enabled ? 'Увімкнено' : 'Вимкнено'}<br/>
                    {f.last_run ? new Date(f.last_run).toLocaleString() : ''}<br/>
                    {f.last_status || ''}
                  </td>
                  <td className="whitespace-nowrap">
                    <button className="btn-outline mr-2" onClick={()=>toggle(f)}>{f.enabled ? 'Вимк.' : 'Увімк.'}</button>
                    <button className="btn-outline mr-2" onClick={()=>run(f,'full_import')}>Повний імпорт</button>
                    <button className="btn-outline mr-2" onClick={()=>run(f,'stock_only')}>Оновити наявність</button>
                    <button className="btn-outline" onClick={()=>removeFeed(f)}>Видалити</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
