import { useEffect, useRef, useState } from "react";

/**
 * Простий WYSIWYG із перемикачем "Джерело"
 * Фікси: обмеження ширини контенту, перенос довгих слів,
 * responsive зображення/таблиці, мʼяке прокручування.
 */
export default function RichEditor({
  value = "",
  onChange = () => {},
  placeholder = "Опис товару…",
  minHeight = 220,
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

  // Невеличкий "санітайзер" ширини для вставок із буфера
  const onPaste = (e) => {
    // даємо браузеру вставити як HTML…
    setTimeout(() => {
      const el = editorRef.current;
      if (!el) return;
      // Приберемо небезпечні max-width/width > 100% у style
      el.querySelectorAll("[style]").forEach((n) => {
        const s = n.getAttribute("style") || "";
        // забираємо ширини, що ламають верстку
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
      {/* Локальні стилі, щоб нічого не їхало за межі */}
      <style>{`
        .rich-editor .toolbar .btn-ghost {
          padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,.06);
        }
        .rich-editor .editor-surface {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border: 1px solid rgba(0,0,0,.1);
          border-radius: 12px;
          background: #fff;
          min-height: ${minHeight}px;
          overflow: auto;               /* <— прокрутка всередині */
          max-width: 100%;              /* <— ніколи не ширше контейнера */
          word-break: break-word;       /* <— перенос довгих слів */
          overflow-wrap: anywhere;
        }
        .rich-editor .editor-surface:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8; /* slate-400 */
        }
        .rich-editor .editor-surface * {
          max-width: 100%;              /* <— елементам не даємо вилазити */
        }
        .rich-editor .editor-surface img {
          max-width: 100%; height: auto; display: inline-block;
        }
        .rich-editor .editor-surface table {
          width: 100%; table-layout: auto; border-collapse: collapse;
        }
        .rich-editor .editor-surface td, 
        .rich-editor .editor-surface th {
          border: 1px solid rgba(0,0,0,.08); padding: 6px;
        }
        /* прибираємо великі відступи, що можуть штовхати контейнер */
        .rich-editor .editor-surface > :first-child { margin-top: 0 !important; }
        .rich-editor .editor-surface > :last-child  { margin-bottom: 0 !important; }
        /* textarea для "Джерело" той самий контейнер */
        .rich-editor .source-area {
          width: 100%; min-height: ${minHeight}px;
          box-sizing: border-box;
          padding: 12px 14px;
          border: 1px solid rgba(0,0,0,.1);
          border-radius: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          line-height: 1.5;
          white-space: pre-wrap;
        }
      `}</style>

      {/* toolbar */}
      <div className="toolbar flex flex-wrap gap-1 mb-2">
        <button type="button" className="btn-ghost" title="Жирний" onClick={() => exec("bold")}>B</button>
        <button type="button" className="btn-ghost" title="Курсив" onClick={() => exec("italic")}><i>І</i></button>
        <button type="button" className="btn-ghost" title="Підкреслення" onClick={() => exec("underline")}><u>U</u></button>
        <button type="button" className="btn-ghost" title="Закреслення" onClick={() => exec("strikeThrough")}><s>S</s></button>

        <div className="mx-2 h-6 w-px bg-slate-300" />

        <button type="button" className="btn-ghost" title="Маркерований список" onClick={() => exec("insertUnorderedList")}>• Список</button>
        <button type="button" className="btn-ghost" title="Нумерований список" onClick={() => exec("insertOrderedList")}>1. Список</button>

        <div className="mx-2 h-6 w-px bg-slate-300" />

        <button type="button" className="btn-ghost" title="H2" onClick={() => exec("formatBlock", "H2")}>H2</button>
        <button type="button" className="btn-ghost" title="H3" onClick={() => exec("formatBlock", "H3")}>H3</button>
        <button type="button" className="btn-ghost" title="Звичайний" onClick={() => exec("formatBlock", "P")}>P</button>

        <div className="mx-2 h-6 w-px bg-slate-300" />

        <button type="button" className="btn-ghost" title="Посилання" onClick={insertLink}>🔗</button>
        <button type="button" className="btn-ghost" title="Зображення (URL)" onClick={insertImage}>🖼️</button>

        <div className="mx-2 h-6 w-px bg-slate-300" />

        <button type="button" className="btn-ghost" title="Ліворуч" onClick={() => exec("justifyLeft")}>⟸</button>
        <button type="button" className="btn-ghost" title="По центру" onClick={() => exec("justifyCenter")}>≡</button>
        <button type="button" className="btn-ghost" title="Праворуч" onClick={() => exec("justifyRight")}>⟹</button>

        <div className="mx-2 h-6 w-px bg-slate-300" />

        <button type="button" className="btn-ghost" title="Undo" onClick={() => exec("undo")}>↶</button>
        <button type="button" className="btn-ghost" title="Redo" onClick={() => exec("redo")}>↷</button>
        <button type="button" className="btn-ghost" title="Очистити форматування" onClick={() => exec("removeFormat")}>🧹</button>
        <button type="button" className="btn-ghost" title="Очистити все" onClick={clearAll}>✖</button>

        <div className="mx-2 h-6 w-px bg-slate-300" />

        <button
          type="button"
          className={`btn-ghost ${showSource ? "bg-slate-200" : ""}`}
          title="Показати/сховати HTML"
          onClick={() => setShowSource((v) => !v)}
        >
          Джерело
        </button>
      </div>

      {/* Surface / Source */}
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
          // показуємо розмітку прямо у полі редагування
          dangerouslySetInnerHTML={{ __html: html || "" }}
        />
      )}
    </div>
  );
}
