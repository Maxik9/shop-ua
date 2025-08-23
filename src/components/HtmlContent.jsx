import DOMPurify from 'dompurify'

export default function HtmlContent({ html = '', className = '' }) {
  // Дозволяємо style, щоб не зрізати inline-центрування (margin:0 auto) з редактора
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_ATTR: [
      'style',          // головне для центрування IMG / вирівнювання параграфів
      'href', 'target', 'rel', 'title',
      'src', 'alt', 'width', 'height'
    ],
    // ALLOWED_TAGS: false -> дозволяє всі безпечні, решту DOMPurify відріже сам
  })

  // Локальні стилі лише для виводу опису (не впливають на інші частини сайту)
  const css = `
  .rte-content ul {
    list-style: disc;
    margin: .5em 0 .5em 1.25em;
    padding-left: 1.25em;
  }
  .rte-content ol {
    list-style: decimal;
    margin: .5em 0 .5em 1.25em;
    padding-left: 1.25em;
  }
  .rte-content li { margin: .2em 0; }

  .rte-content img {
    max-width: 100%;
    height: auto;
  }
  /* Якщо редактор поставив margin:0 auto — додатково гарантуємо block */
  .rte-content img[style*="margin: 0 auto"] {
    display: block;
  }
  `

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        className={`prose max-w-none break-words rte-content ${className}`}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </>
  )
}
