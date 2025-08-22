import { useEffect, useRef, useState } from "react";

/**
 * WYSIWYG із «липким» тулбаром і внутрішнім скролом редактора.
 * - Toolbar: position: sticky; завжди доступний
 * - Editor: власний скрол, adaptive контент
 */
export default function RichEditor({
  value = "",
  onChange = () => {},
  placeholder = "Опис товару…",
  minHeight = 220,
  maxHeight = 420, // 👈 тепер можна керувати максимальною висотою області редагування
}) {
  const [html, setHtml] = useState(value || "");
  const [showSource, setShowSource] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    setHtml(value || "");
  }, [value]);

  const setAndEmit = (next) => {
    setHtml(next);
    onChange(next);
  };

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    setAndEmit(editorRef.current?.innerHTML || "");
  };

  const insertLink = () => {
    const url = prompt("Вставте посилання (https://…):", "");
    if (!url) return;
    exec("createLink", url);
  };

  const insertImage = () => {
    const url = prompt("URL зображення:", "");
    if (!url) return;
    exec("insertImage", url);
  };

  const clearAll = () => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = "";
    setAndEmit("");
  };

  const onInput = () => setAndEmit(editorRef.current?.innerHTML || "");

  const onPaste = () => {
    // Після вставки прибираємо ширини, що роздувають контент
    setTimeout(() => {
      const el = editorRef.current;
      if (!el) return;
      el.querySelectorAll("[style]").forEach((n) => {
        const s = n.getAttribute("style") || "";
        const cleaned = s
          .replace(/(?:^|;)\s*width\s*:\s*[^;]+/gi, "")
          .replace(/(?:^|;)\s*max-width\s*:\s*[^;]+/gi, "");
        n.setAttribute("style", cleaned);
      });
      setAndEmit(el.innerHTML);
    }, 0);
  };

  return (
    <div className="rich-editor">
      <style>{`
        .rich-editor {
          --re-minh: ${minHeight}px;
          --re-maxh: ${maxHeight}px;
          border: 1px solid rgba(0,0,0,.1);
          border-radius: 12px;
          background: #fff;
        }

        .rich-editor .toolbar {
          position: sticky;
          top: 0;                 /* 👈 "липне" до верху контейнера */
          z-index: 20;
          background: #fff;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 10px;
          border-bottom: 1px solid rgba(0,0,0,.06);
        }

        .rich-editor .btn-ghost {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,.06);
          background: #fff;
          cursor: pointer;
        }
        .rich-editor .btn-ghost:hover { background: #f3f4f6; }

        .rich-editor .editor-wrap {
          padding: 10px; /* внутрішні відступи для області редагування */
        }

        .rich-editor .editor-surface {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,.06);
          min-height: var(--re-minh);
          max-height: var(--re-maxh); /* 👈 власний скрол */
          overflow: auto;
          word-break: break-word;
          overflow-wrap: anywhere;
          background: #fff;
        }
        .rich-editor .editor-surface:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
        .rich-editor .editor-surface * { max-width: 100%; }
        .rich-editor .editor-surface img { max-width: 100%; height: auto; display: inline-block; }
        .rich-editor .editor-surface table { width: 100%; table-layout: auto; border-collapse: collapse; }
        .rich-editor .editor-surface td, .rich-editor .editor-surface th {
          border: 1px solid rgba(0,0,0,.08); padding: 6px;
        }
        .rich-editor .editor-surface > :first-child { margin-top: 0 !important; }
        .rich-editor .editor-surface > :last-child  { margin-bottom: 0 !important; }

        .rich-editor .source-area {
          width: 100%;
          min-height: var(--re-minh);
          max-height: var(--re-maxh);
          overflow: auto;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,.06);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          line-height: 1.5;
          white-space: pre-wrap;
          background: #fff;
        }

        .rich-editor .divider {
          width: 1px; height: 24px; background: #e5e7eb; margin: 0 6px;
        }
      `}</style>

      {/* sticky toolbar */}
      <div className="toolbar">
        <button type="button" className="btn-ghost" title="Жирний" onClick={() => exec("bold")}>B</button>
        <button type="button" className="btn-ghost" title="Курсив" onClick={() => exec("italic")}><i>І</i></button>
        <button type="button" className="btn-ghost" title="Підкреслення" onClick={() => exec("underline")}><u>U</u></button>
        <button type="button" className="btn-ghost" title="Закреслення" onClick={() => exec("strikeThrough")}><s>S</s></button>

        <span className="divider" />

        <button type="button" className="btn-ghost" title="Маркерований список" onClick={() => exec("insertUnorderedList")}>• Список</button>
        <button type="button" className="btn-ghost" title="Нумерований список" onClick={() => exec("insertOrderedList")}>1. Список</button>

        <span className="divider" />

        <button type="button" className="btn-ghost" title="H2" onClick={() => exec("formatBlock", "H2")}>H2</button>
        <button type="button" className="btn-ghost" title="H3" onClick={() => exec("formatBlock", "H3")}>H3</button>
        <button type="button" className="btn-ghost" title="Звичайний абзац" onClick={() => exec("formatBlock", "P")}>P</button>

        <span className="divider" />

        <button type="button" className="btn-ghost" title="Посилання" onClick={insertLink}>🔗</button>
        <button type="button" className="btn-ghost" title="Зображення (URL)" onClick={insertImage}>🖼️</button>

        <span className="divider" />

        <button type="button" className="btn-ghost" title="Ліворуч" onClick={() => exec("justifyLeft")}>⟸</button>
        <button type="button" className="btn-ghost" title="По центру" onClick={() => exec("justifyCenter")}>≡</button>
        <button type="button" className="btn-ghost" title="Праворуч" onClick={() => exec("justifyRight")}>⟹</button>

        <span className="divider" />

        <button type="button" className="btn-ghost" title="Undo" onClick={() => exec("undo")}>↶</button>
        <button type="button" className="btn-ghost" title="Redo" onClick={() => exec("redo")}>↷</button>
        <button type="button" className="btn-ghost" title="Очистити форматування" onClick={() => exec("removeFormat")}>🧹</button>
        <button type="button" className="btn-ghost" title="Очистити все" onClick={clearAll}>✖</button>

        <span className="divider" />

        <button
          type="button"
          className={`btn-ghost ${showSource ? "bg-slate-200" : ""}`}
          title="Показати/сховати HTML"
          onClick={() => setShowSource((v) => !v)}
        >
          Джерело
        </button>
      </div>

      {/* scrollable editor area */}
      <div className="editor-wrap">
        {showSource ? (
          <textarea
            className="source-area"
            value={html}
            onChange={(e) => setAndEmit(e.target.value)}
            placeholder="<p>HTML опис…</p>"
          />
        ) : (
          <div
            ref={editorRef}
            className="editor-surface"
            contentEditable
            suppressContentEditableWarning
            onInput={onInput}
            onPaste={onPaste}
            data-placeholder={placeholder}
            dangerouslySetInnerHTML={{ __html: html || "" }}
          />
        )}
      </div>
    </div>
  );
}
