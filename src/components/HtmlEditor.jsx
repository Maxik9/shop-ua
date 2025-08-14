import { useRef, useState, useEffect } from 'react'
import DOMPurify from 'dompurify'

export default function HtmlEditor({ value = '', onChange = () => {}, placeholder = 'Опис…', className = '' }) {
  const ref = useRef(null)
  const [html, setHtml] = useState(value || '')

  useEffect(() => { setHtml(value || '') }, [value])

  const sanitize = (raw) => DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p','br','strong','b','em','i','u','s','sub','sup',
      'ul','ol','li','blockquote','hr',
      'h1','h2','h3','h4','h5','h6',
      'img','a','span','div','table','thead','tbody','tr','td','th'
    ],
    ALLOWED_ATTR: [
      'href','target','rel',
      'src','alt','title','width','height','loading',
      'class','style','colspan','rowspan','align'
    ],
    ADD_ATTR: ['loading']
  })

  const exec = (cmd, val = null) => {
    ref.current?.focus()
    document.execCommand(cmd, false, val)
    handleInput()
  }

  const insertLink = () => {
    const url = window.prompt('Вставити посилання (https://...)')
    if (!url) return
    exec('createLink', url)
    const sel = window.getSelection()
    if (sel && sel.anchorNode) {
      const a = sel.anchorNode.parentElement?.closest('a')
      if (a) { a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer') }
    }
  }

  const insertImage = () => {
    const url = window.prompt('URL зображення')
    if (!url) return
    exec('insertImage', url)
    ref.current?.querySelectorAll('img').forEach(img => img.setAttribute('loading','lazy'))
  }

  const handleInput = () => {
    const raw = ref.current?.innerHTML || ''
    const clean = sanitize(raw)
    setHtml(clean)
    onChange(clean)
  }

  return (
    <div className={`border rounded-md bg-white ${className}`}>
      <div className="flex flex-wrap gap-1 items-center p-2 border-b bg-slate-50 text-sm">
        <button type="button" onClick={() => exec('formatBlock', '<h2>')} className="px-2 py-1 rounded hover:bg-slate-200">H2</button>
        <button type="button" onClick={() => exec('bold')} className="px-2 py-1 rounded hover:bg-slate-200 font-bold">B</button>
        <button type="button" onClick={() => exec('italic')} className="px-2 py-1 rounded hover:bg-slate-200 italic">I</button>
        <button type="button" onClick={() => exec('underline')} className="px-2 py-1 rounded hover:bg-slate-200 underline">U</button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button type="button" onClick={() => exec('insertUnorderedList')} className="px-2 py-1 rounded hover:bg-slate-200">• Список</button>
        <button type="button" onClick={() => exec('insertOrderedList')} className="px-2 py-1 rounded hover:bg-slate-200">1. Список</button>
        <button type="button" onClick={() => exec('formatBlock', '<blockquote>')} className="px-2 py-1 rounded hover:bg-slate-200">„Цитата“</button>
        <span className="w-px h-5 bg-slate-300 mx-1" />
        <button type="button" onClick={insertLink} className="px-2 py-1 rounded hover:bg-slate-200">🔗 Лінк</button>
        <button type="button" onClick={insertImage} className="px-2 py-1 rounded hover:bg-slate-200">🖼️ Зображення</button>
      </div>
      <div
        ref={ref}
        className="min-h-[180px] p-3 outline-none"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={handleInput}
        onBlur={handleInput}
        dangerouslySetInnerHTML={{ __html: html || '' }}
        style={{ whiteSpace: 'pre-wrap' }}
      />
      {!html && <div className="pointer-events-none -mt-[164px] p-3 text-slate-400">{placeholder}</div>}
    </div>
  )
}
