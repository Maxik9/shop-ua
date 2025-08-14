import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p','br','strong','b','em','i','u','s','sub','sup',
  'ul','ol','li','blockquote','hr',
  'h1','h2','h3','h4','h5','h6',
  'img','a','span','div','table','thead','tbody','tr','td','th'
]
const ALLOWED_ATTR = [
  'href','target','rel',
  'src','alt','title','width','height','loading',
  'class','style','colspan','rowspan','align'
]

export default function HtmlContent({ html = '', className = '' }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    USE_PROFILES: { html: true },
    ADD_ATTR: ['loading']
  })
  return (
    <div
      className={`prose max-w-none break-words ${className}`}
      style={{ overflowX: 'hidden', wordBreak: 'break-word' }}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
