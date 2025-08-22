import { useEffect, useRef, useState } from "react";

/**
 * Простий WYSIWYG з кнопкою "Джерело".
 * Повертає HTML у onChange, показує live-вигляд як на сайті.
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

  return (
    <div>
      {/* toolbar */}
      <div className="flex flex-wrap gap-1 mb-2">
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

      {/* редактор */}
      {showSource ? (
        <textarea
          className="input font-mono min-h-[220px]"
          style={{ minHeight }}
          value={html}
          onChange={(e) => setAndEmit(e.target.value)}
          placeholder="<p>HTML опис…</p>"
        />
      ) : (
        <div
          ref={editorRef}
          className="input min-h-[220px] prose max-w-none"
          style={{ minHeight }}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          placeholder={placeholder}
          // зберігаємо розмітку, щоб одразу бачити як на сайті
          dangerouslySetInnerHTML={{ __html: html || "" }}
        />
      )}
    </div>
  );
}
