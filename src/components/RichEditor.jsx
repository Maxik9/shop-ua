// src/components/RichEditor.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Легкий WYSIWYG-редактор на базі contentEditable.
 * - Жирний/курсив/підкреслення/закреслення
 * - Маркований/нумерований список (із локальним CSS для крапок/цифр)
 * - Вставка посилань та зображень
 * - Вирівнювання тексту
 * - Кнопка «Центрувати зображення» → display:block; margin:0 auto; float:none
 * - Перемикач «Джерело» (HTML)
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

  // синхронізація зовнішнього value
  useEffect(() => {
    setHtml(value || "");
    if (!showSource && editorRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, showSource]);

  // первинний вміст
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html || "";
    }
  }, []); // один раз

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
    const url = window.prompt("Вставте посилання (https://…):", "");
    if (!url) return;
    exec("createLink", url);
  };

  const insertImage = () => {
    const url = window.prompt("URL зображення:", "");
    if (!url) return;
    exec("insertImage", url);
  };

  // Знайти IMG в поточному виділенні (або єдине зображення в батьківському блоці)
  const getSelectedImage = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    // 1) якщо курсор прямо на IMG
    let node = sel.anchorNode;
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let cur = node;
    while (cur && cur !== editorRef.current) {
      if (cur.nodeName === "IMG") return cur;
      cur = cur.parentNode;
    }

    // 2) якщо виділення охоплює IMG
    const range = sel.getRangeAt(0);
    const frag = range.cloneContents();
    const imgInside = frag.querySelector && frag.querySelector("img");
    if (imgInside) return imgInside;

    // 3) якщо курсор у параграфі з єдиним IMG
    const block = node.closest ? node.closest("p,div") : null;
    if (block) {
      const imgs = block.getElementsByTagName("img");
      if (imgs && imgs.length === 1) return imgs[0];
    }

    return null;
    };

  const centerImage = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();

    const img = getSelectedImage();
    if (!img) {
      alert("Клікніть по картинці (виділіть її) і ще раз натисніть «Центрувати зображення».");
      return;
    }

    // гарантоване центрування
    img.style.display = "block";
    img.style.margin = "0 auto";
    img.style.float = "none";
    emit();
  };

  const clearAll = () => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = "";
    emit();
  };

  const onInput = () => emit();

  // чистимо ширини після paste, щоб не ламало верстку
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

  // локальні стилі тільки для редактора — вирішення проблеми зі списками
  const styleTag = useMemo(() => {
    const css = `
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
.rich-editor .divider { width: 1px; height: 24px; background: #e5e7eb; margin: 0 6px; }

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
/* ВАЖЛИВО: списки завжди з маркерами/цифрами та відступами */
.rich-editor .editor-surface ul {
  list-style: disc;
  margin: 0.5em 0 0.5em 1.25em;
  padding-left: 1.25em;
}
.rich-editor .editor-surface ol {
  list-style: decimal;
  margin: 0.5em 0 0.5em 1.25em;
  padding-left: 1.25em;
}
.rich-editor .editor-surface li { margin: 0.2em 0; }

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
    `.trim();
    return <style dangerouslySetInnerHTML={{ __html: css }} />;
  }, [minHeight, maxHeight]);

  return (
    <div className="rich-editor">
      {styleTag}

      {/* Тулбар */}
      <div className="toolbar">
        <button className="btn-ghost" onClick={() => exec("bold")}><b>B</b></button>
        <button className="btn-ghost" onClick={() => exec("italic")}><i>І</i></button>
        <button className="btn-ghost" onClick={() => exec("underline")}><u>U</u></button>
        <button className="btn-ghost" onClick={() => exec("strikeThrough")}><s>S</s></button>
        <span className="divider" />
        <button className="btn-ghost" onClick={() => exec("insertUnorderedList")}>• Список</button>
        <button className="btn-ghost" onClick={() => exec("insertOrderedList")}>1. Список</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={() => exec("justifyLeft")}>⟸</button>
        <button className="btn-ghost" onClick={() => exec("justifyCenter")}>≡</button>
        <button className="btn-ghost" onClick={() => exec("justifyRight")}>⟹</button>
        <span className="divider" />
        <button className="btn-ghost" onClick={insertLink}>🔗</button>
        <button className="btn-ghost" onClick={insertImage}>🖼️</button>
        <button className="btn-ghost" onClick={centerImage}>🧲 Центр</button>
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
