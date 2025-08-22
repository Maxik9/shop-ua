import { useEffect, useRef, useState } from "react";

/**
 * RichEditor (без стрибка скролу/курсора)
 */
export default function RichEditor({
  value = "",
  onChange = () => {},
  placeholder = "Опис товару…",
  minHeight = 220,
  maxHeight = 420,
}) {
  const editorRef = useRef(null);
  const [showSource, setShowSource] = useState(false);
  const [html, setHtml] = useState(value || "");

  useEffect(() => {
    setHtml(value || "");
    if (!showSource && editorRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, showSource]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html || "";
    }
  }, []); 

  const emit = () => {
    const cur = editorRef.current?.innerHTML || "";
    setHtml(cur);
    onChange(cur);
  };

  const exec = (cmd, val = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
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
    emit();
  };

  const onInput = () => emit();

  const onPaste = () => {
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
      emit();
    }, 0);
  };

  const toggleSource = () => {
    if (!showSource) {
      setHtml(editorRef.current?.innerHTML || "");
      setShowSource(true);
    } else {
      setShowSource(false);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = html || "";
          onChange(html || "");
        }
      });
    }
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
          overflow: hidden;
        }

        .rich-editor .toolbar {
          position: sticky;
          top: 0;
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

        .rich-editor .editor-wrap { padding: 10px; }

        .rich-editor .editor-surface {
          width: 100%;
          box-sizing: border-box;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,.06);
          min-height: var(--re-minh);
          max-height: var(--re-maxh);
          overflow: auto;
          overflow-anchor: none;
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

      {/* toolbar */}
      <div className="toolbar">
        <button className="btn-ghost" onClick={() => exec("bold")}>B</button>
        <button className="btn-ghost" onClick={() => exec("italic")}><i>І</i></button>
        <button className="btn-ghost" onClick={() => exec("underline")}><u>U</u></button>
        <button className="btn-ghost" onClick={() => exec("strikeThrough")}><s>S</s></button>
        <span className="divider" />
        <button className="btn-ghost" onClick={() => exec("insertUnorderedList")}>• Список</button>
        <button className="btn-ghost" onClick={() => exec("insertOrderedList")}>1. Список</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={() => exec("formatBlock", "H2")}>H2</button>
        <button className="btn-ghost" onClick={() => exec("formatBlock", "H3")}>H3</button>
        <button className="btn-ghost" onClick={() => exec("formatBlock", "P")}>P</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={insertLink}>🔗</button>
        <button className="btn-ghost" onClick={insertImage}>🖼️</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={() => exec("justifyLeft")}>⟸</button>
        <button className="btn-ghost" onClick={() => exec("justifyCenter")}>≡</button>
        <button className="btn-ghost" onClick={() => exec("justifyRight")}>⟹</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={() => exec("undo")}>↶</button>
        <button className="btn-ghost" onClick={() => exec("redo")}>↷</button>
        <button className="btn-ghost" onClick={() => exec("removeFormat")}>🧹</button>
        <button className="btn-ghost" onClick={clearAll}>✖</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={toggleSource}>Джерело</button>
      </div>

      <div className="editor-wrap">
        {showSource ? (
          <textarea
            className="source-area"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            onBlur={() => onChange(html)}
          />
        ) : (
          <div
            ref={editorRef}
            className="editor-surface"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={placeholder}
            onInput={onInput}
            onPaste={onPaste}
          />
        )}
      </div>
    </div>
  );
}
