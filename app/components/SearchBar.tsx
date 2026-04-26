import React, { useState, useEffect, useRef } from "react";

type Board = {
  id: string;
  name: string;
};

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  darkMode: boolean;

  // Search scope
  boards: Board[];
  searchScopeBoardId: string;
  onSearchScopeChange: (boardId: string) => void;

  // Creator toggle
  showCreator: boolean;
  onToggleCreator: () => void;

  // Create board
  onCreateBoard: () => void;
};

function copyToClipboardSafe(text: string) {
  if (typeof window === "undefined") return;
  if (navigator && "clipboard" in navigator && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(value: string) {
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  } catch {
    // quietly give up
  }
}

export default function SearchBar({
  search,
  onSearchChange,
  darkMode,
  boards,
  searchScopeBoardId,
  onSearchScopeChange,
  showCreator,
  onToggleCreator,
  onCreateBoard,
}: SearchBarProps) {
  const [autoCaps, setAutoCaps] = useState(false);
  const [trimTo100, setTrimTo100] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardBg = darkMode ? "#020617" : "white";
  const borderBase = darkMode ? "#1d4ed8" : "#bfdbfe";
  const accent = "#3b82f6";
  const textColor = darkMode ? "#e5e7eb" : "#111827";
  const mutedText = darkMode ? "#9ca3af" : "#6b7280";
  const inputBg = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  function triggerCopied(text: string) {
    copyToClipboardSafe(text);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  function applyTransforms(raw: string, caps: boolean, trim: boolean): string {
    let result = raw;
    if (caps) result = result.toUpperCase();
    if (trim) result = result.slice(0, 100);
    return result;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const transformed = applyTransforms(e.target.value, autoCaps, trimTo100);
    onSearchChange(transformed);
    if (transformed && (autoCaps || trimTo100)) triggerCopied(transformed);
    else setCopied(false);
  }

  function handleAutoCapsToggle(checked: boolean) {
    setAutoCaps(checked);
    if (search) {
      const transformed = applyTransforms(search, checked, trimTo100);
      onSearchChange(transformed);
    }
  }

  function handleTrimToggle(checked: boolean) {
    setTrimTo100(checked);
    if (search) {
      const transformed = applyTransforms(search, autoCaps, checked);
      onSearchChange(transformed);
    }
  }

  function handleClear() {
    onSearchChange("");
    setCopied(false);
  }

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    fontSize: "0.8rem",
    color: textColor,
    cursor: "pointer",
    userSelect: "none",
  };

  const checkboxStyle: React.CSSProperties = {
    width: "14px",
    height: "14px",
    accentColor: accent,
    cursor: "pointer",
  };

  return (
    <section
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        borderTopStyle: "solid",
        borderBottomStyle: "solid",
        borderLeftStyle: "solid",
        borderRightStyle: "solid",
        borderTopWidth: "2px",
        borderBottomWidth: "2px",
        borderLeftWidth: "1px",
        borderRightWidth: "1px",
        borderTopColor: accent,
        borderBottomColor: accent,
        borderLeftColor: borderBase,
        borderRightColor: borderBase,
        borderRadius: "10px",
        backgroundColor: cardBg,
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
        marginBottom: "0.5rem",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>

        {/* Top row: label + copied badge + Create Board + New Template */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label
              htmlFor="search"
              style={{ fontWeight: 500, color: textColor, fontSize: "0.95rem" }}
            >
              Search templates
            </label>

            {copied && (
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: darkMode ? "#4ade80" : "#15803d",
                  backgroundColor: darkMode ? "#052e16" : "#f0fdf4",
                  border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`,
                  borderRadius: "999px",
                  padding: "0.1rem 0.55rem",
                }}
              >
                ✓ Copied
              </span>
            )}
          </div>

          {/* Right side: Create Board + New Template */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onCreateBoard}
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: "999px",
                border: "1px solid #3b82f6",
                backgroundColor: darkMode ? "#020617" : "#eff6ff",
                color: darkMode ? "#bfdbfe" : "#1d4ed8",
                fontSize: "0.8rem",
                cursor: "pointer",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              + Create Board
            </button>

            <button
              type="button"
              onClick={onToggleCreator}
              style={{
                padding: "0.35rem 0.9rem",
                borderRadius: "999px",
                border: `1px solid ${showCreator ? accent : darkMode ? "#4b5563" : "#d1d5db"}`,
                backgroundColor: showCreator
                  ? darkMode ? "#1e3a5f" : "#eff6ff"
                  : darkMode ? "#020617" : "white",
                color: showCreator
                  ? darkMode ? "#93c5fd" : "#1d4ed8"
                  : textColor,
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              {showCreator ? "✕ Close Creator" : "+ New Template"}
            </button>
          </div>
        </div>

        {/* Search input */}
        <input
          id="search"
          type="text"
          value={search}
          onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder="Type to search titles..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: `1px solid ${inputBorder}`,
            backgroundColor: inputBg,
            color: textColor,
          }}
        />

        {/* Bottom row: toggles + char count (left) | Clear Search Bar (right) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            paddingTop: "0.1rem",
          }}
        >
          {/* Left: checkboxes + char count */}
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={autoCaps}
                onChange={(e) => handleAutoCapsToggle(e.target.checked)}
                style={checkboxStyle}
              />
              <span>Auto CAPS</span>
              {autoCaps && (
                <span style={{ fontSize: "0.7rem", color: accent }}>on</span>
              )}
            </label>

            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={trimTo100}
                onChange={(e) => handleTrimToggle(e.target.checked)}
                style={checkboxStyle}
              />
              <span>Trim to 100</span>
              {trimTo100 && (
                <span style={{ fontSize: "0.7rem", color: accent }}>on</span>
              )}
            </label>

            {trimTo100 && search.length > 0 && (
              <span
                style={{
                  fontSize: "0.75rem",
                  color: search.length >= 100 ? "#b91c1c" : mutedText,
                }}
              >
                {search.length}/100
              </span>
            )}
          </div>

          {/* Right: Clear Search Bar — only visible when there's text */}
          {search.trim().length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                padding: "0.3rem 0.85rem",
                borderRadius: "999px",
                border: "1px solid #fca5a5",
                backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5",
                color: darkMode ? "#fca5a5" : "#dc2626",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Clear Search Bar
            </button>
          )}
        </div>

        {/* Search scope */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: mutedText,
          }}
        >
          <span>Search in:</span>
          <select
            value={searchScopeBoardId}
            onChange={(e) => onSearchScopeChange(e.target.value)}
            style={{
              padding: "0.25rem 0.6rem",
              borderRadius: "999px",
              border: "1px solid #9ca3af",
              backgroundColor: darkMode ? "#020617" : "white",
              color: textColor,
              fontSize: "0.8rem",
            }}
          >
            <option value="all">All boards</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}