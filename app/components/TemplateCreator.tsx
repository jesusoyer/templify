import React, { useRef, useEffect } from "react";

type TemplateCreatorProps = {
  title: string;
  body: string;                 // now stores HTML (bold/italic/underline/color/bullets)
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onAddToBoardClick: () => void;
  darkMode: boolean;
  currentBoardName: string;
  onHide: () => void;
};

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Red",     value: "#dc2626" },
  { label: "Orange",  value: "#ea580c" },
  { label: "Yellow",  value: "#ca8a04" },
  { label: "Green",   value: "#16a34a" },
  { label: "Blue",    value: "#2563eb" },
  { label: "Purple",  value: "#7c3aed" },
];

export default function TemplateCreator({
  title,
  body,
  onTitleChange,
  onBodyChange,
  onSubmit,
  onAddToBoardClick,
  darkMode,
  currentBoardName,
  onHide,
}: TemplateCreatorProps) {
  const cardBg = darkMode ? "#020617" : "white";
  const borderBase = darkMode ? "#1d4ed8" : "#bfdbfe";
  const accent = "#3b82f6";
  const textColor = darkMode ? "#e5e7eb" : "#111827";
  const inputBg = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";
  const toolbarBg = darkMode ? "#0f172a" : "#f3f4f6";

  const editorRef = useRef<HTMLDivElement>(null);

  // Keep the contentEditable div's actual DOM in sync when `body` changes
  // from outside (e.g. clearing the form after submit) without fighting
  // the user's cursor while they're actively typing.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== body) {
      editorRef.current.innerHTML = body;
    }
  }, [body]);

  const savedRangeRef     = useRef<Range | null>(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableHover,      setTableHover]      = useState<{rows:number;cols:number}>({rows:0,cols:0});

  function handleEditorInput() {
    if (editorRef.current) onBodyChange(editorRef.current.innerHTML);
  }

  // Remember the current text selection while the editor has focus, so we
  // can restore it after the user interacts with a toolbar control (like the
  // color <select>) that would otherwise steal focus away from the editor.
  function saveSelection() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restoreSelection() {
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  }

  function applyFormat(command: string, value?: string) {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    handleEditorInput();
  }

  // "Clear" strips ALL formatting from the whole body, not just whatever
  // happens to be selected — execCommand("removeFormat") only affects a
  // selection and is unreliable for lists/colors, so we just plain-text it.
  function clearAllFormatting() {
    if (!editorRef.current) return;
    const plainText = editorRef.current.innerText;
    editorRef.current.innerHTML = "";
    editorRef.current.innerText = plainText;
    editorRef.current.focus();
    handleEditorInput();
  }

  function insertTable(rows: number, cols: number) {
    editorRef.current?.focus();
    restoreSelection();
    const colW = Math.round(100 / cols);
    let html = `<table style="border-collapse:collapse;width:100%;margin:0.5rem 0"><tbody>`;
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        html += `<td style="border:1px solid #94a3b8;padding:0.35rem 0.5rem;min-width:60px;width:${colW}%">&nbsp;</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    document.execCommand("insertHTML", false, html);
    setShowTablePicker(false);
    handleEditorInput();
  }

  const trimmedBoardName = currentBoardName?.trim() || "Home";
  const isHome =
    trimmedBoardName.toLowerCase() === "home" ||
    trimmedBoardName.toLowerCase() === "home board";

  const primaryButtonLabel = isHome
    ? "Save to Default Home Board"
    : `Save to ${trimmedBoardName}`;

  const toolbarBtnStyle: React.CSSProperties = {
    padding: "0.3rem 0.55rem",
    borderRadius: "5px",
    border: `1px solid ${inputBorder}`,
    backgroundColor: darkMode ? "#1e293b" : "white",
    color: textColor,
    fontSize: "0.85rem",
    cursor: "pointer",
    lineHeight: 1,
    minWidth: "2rem",
  };

  return (
    <section
      style={{
        width: "100%",
        padding: "1rem",
        borderTopStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderRightStyle: "solid",
        borderTopWidth: "3px",
        borderBottomWidth: "3px",
        borderLeftWidth: "1px",
        borderRightWidth: "1px",
        borderTopColor: accent,
        borderBottomColor: accent,
        borderLeftColor: borderBase,
        borderRightColor: borderBase,
        borderRadius: "10px",
        backgroundColor: cardBg,
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.18)",
        position: "relative",
      }}
    >
      {/* Header row: title + Hide Creator button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 600,
            margin: 0,
            color: textColor,
          }}
        >
          Create New Template
        </h2>

        <button
          type="button"
          onClick={onHide}
          style={{
            padding: "0.25rem 0.75rem",
            borderRadius: "999px",
            border: "1px solid #fca5a5",
            backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5",
            color: darkMode ? "#fca5a5" : "#dc2626",
            fontSize: "0.78rem",
            fontWeight: 500,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ✕ Close Creator
        </button>
      </div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label htmlFor="title" style={{ fontWeight: 500, color: textColor }}>
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Write a title with keywords for easy search"
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: textColor,
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <label style={{ fontWeight: 500, color: textColor }}>
            Template body
          </label>

          {/* ── Formatting toolbar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap",
            padding: "0.4rem", borderRadius: "6px 6px 0 0",
            border: `1px solid ${inputBorder}`, borderBottom: "none",
            backgroundColor: toolbarBg,
          }}>
            <button type="button" title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("bold")}
              style={{ ...toolbarBtnStyle, fontWeight: 800 }}>B</button>
            <button type="button" title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("italic")}
              style={{ ...toolbarBtnStyle, fontStyle: "italic", fontWeight: 600 }}>I</button>
            <button type="button" title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("underline")}
              style={{ ...toolbarBtnStyle, textDecoration: "underline", fontWeight: 600 }}>U</button>
            <button type="button" title="Bullet list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("insertUnorderedList")}
              style={toolbarBtnStyle}>• List</button>
            <button type="button" title="Numbered list" onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat("insertOrderedList")}
              style={toolbarBtnStyle}>1. List</button>

            <div style={{ position: "relative", display: "inline-block" }}>
              <button type="button" title="Insert table" onMouseDown={(e) => e.preventDefault()} onClick={() => { restoreSelection(); setShowTablePicker((p) => !p); }}
                style={toolbarBtnStyle}>⊞ Table</button>
              {showTablePicker && (
                <div onMouseLeave={() => setTableHover({rows:0,cols:0})} style={{ position:"absolute", top:"110%", left:0, zIndex:100, backgroundColor: darkMode?"#1e293b":"white", border:`1px solid ${inputBorder}`, borderRadius:"6px", padding:"0.5rem", boxShadow:"0 4px 12px rgba(0,0,0,0.2)" }}>
                  <div style={{ fontSize:"0.68rem", color: darkMode?"#9ca3af":"#6b7280", marginBottom:"0.3rem", whiteSpace:"nowrap" }}>
                    {tableHover.rows > 0 ? `${tableHover.rows} × ${tableHover.cols} table` : "Select size"}
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(6,18px)", gap:"2px" }}>
                    {Array.from({length:36},(_,i) => { const r=Math.floor(i/6)+1, c=(i%6)+1; const active=r<=tableHover.rows&&c<=tableHover.cols; return (
                      <div key={i} onMouseEnter={() => setTableHover({rows:r,cols:c})} onClick={() => insertTable(tableHover.rows, tableHover.cols)}
                        style={{ width:"18px", height:"18px", borderRadius:"2px", cursor:"pointer", backgroundColor: active?(darkMode?"#3b82f6":"#bfdbfe"):(darkMode?"#334155":"#f1f5f9"), border:`1px solid ${active?(darkMode?"#60a5fa":"#93c5fd"):(darkMode?"#475569":"#e2e8f0")}` }}
                      />
                    );})}
                  </div>
                </div>
              )}
            </div>

            <span style={{ width: "1px", height: "1.4rem", backgroundColor: inputBorder, margin: "0 0.15rem" }} />

            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) applyFormat("foreColor", e.target.value); e.target.value = ""; }}
              title="Text color"
              style={{ ...toolbarBtnStyle, cursor: "pointer", paddingRight: "0.3rem" }}
            >
              <option value="" disabled>Color</option>
              {TEXT_COLORS.map((c) => (
                <option key={c.label} value={c.value}>{c.label}</option>
              ))}
            </select>

            <button type="button" title="Clear all formatting" onMouseDown={(e) => e.preventDefault()} onClick={clearAllFormatting}
              style={{ ...toolbarBtnStyle, fontSize: "0.75rem", color: darkMode ? "#9ca3af" : "#6b7280" }}>Clear</button>
          </div>

          {/* ── Rich text editor ── */}
          <div
            ref={editorRef}
            contentEditable
            onInput={handleEditorInput}
            onMouseUp={saveSelection}
            onKeyUp={saveSelection}
            data-placeholder="Write the text you want to reuse..."
            suppressContentEditableWarning
            style={{
              minHeight: "7rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "0 0 6px 6px",
              border: `1px solid ${inputBorder}`,
              backgroundColor: inputBg,
              color: textColor,
              fontSize: "0.9rem",
              lineHeight: 1.5,
              overflowY: "auto",
            }}
          />
          <style>{`
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: ${darkMode ? "#64748b" : "#9ca3af"};
              pointer-events: none;
            }
          `}</style>
        </div>

        {/* Buttons row */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "white",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {primaryButtonLabel}
          </button>

          <button
            type="button"
            onClick={onAddToBoardClick}
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "6px",
              border: `1px solid ${darkMode ? "#4b5563" : "#d1d5db"}`,
              backgroundColor: darkMode ? "#020617" : "white",
              color: textColor,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Add to custom board…
          </button>
        </div>
      </form>
    </section>
  );
}