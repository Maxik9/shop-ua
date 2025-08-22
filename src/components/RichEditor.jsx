import { useEffect, useRef, useState } from "react";

/**
 * RichEditor (без стрибка скролу/курсора)
 * - contentEditable неконтрольований (не перерендерюємо на кожний ввод)
 * - sticky toolbar, внутрішній скрол, paste-cleanup
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
  const [html, setHtml] = useState(value || ""); // використовується для textarea / синхронізації

  // При зовнішній зміні value — оновлюємо і div (коли НЕ в режимі «Джерело»)
  useEffect(() => {
    setHtml(value || "");
    if (!showSource && editorRef.current) {
      if (editorRef.current.innerHTML !== (value || "")) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, showSource]);

  // Ініціалізація контенту при монтуванні
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = html || "";
    }
  }, []); // один раз

  const emit = () => {
    const cur = editorRef.current?.innerHTML || "";
    setHtml(cur);         // збережемо для «Джерело»
    onChange(cur);        // віддамо наверх
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
    // Легке прибирання «ширин», щоб контент не роздувався
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
      // Переходимо в «Джерело»: забираємо поточний HTML з div
      setHtml(editorRef.current?.innerHTML || "");
      setShowSource(true);
    } else {
      // Повертаємось з «Джерело»: заливаємо HTML назад у div
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
          overflow: auto;                /* власний скрол */
          overflow-anchor: none;         /* не «підстрибуємо» */
          word-break: break-word;
          overflow-wrap: anywhere;
          background: #fff;
        }
        .rich-editor .editor-surface:empty:before {
          content: attr(data-placeholder);
          color: #94a3b8;
        }
        .rich-editor .editor-surfac
