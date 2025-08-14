import DOMPurify from 'dompurify'

export default function HtmlContent({ html = '', className = '' }) {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
  return <div className={`prose max-w-none break-words ${className}`} dangerouslySetInnerHTML={{ __html: clean }} />
}
