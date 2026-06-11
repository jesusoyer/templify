import React, { useState, useEffect, useRef } from "react";

type Board = {
  id: string;
  name: string;
};

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  darkMode: boolean;
  boards: Board[];
  searchScopeBoardId: string;
  onSearchScopeChange: (boardId: string) => void;
  showCreator: boolean;
  onToggleCreator: () => void;
  onCreateBoard: () => void;
};

// ─────────────────────────────────────────────
// Clipboard helpers
// ─────────────────────────────────────────────

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
  } catch {}
}

// ─────────────────────────────────────────────
// Month / ordinal helpers
// ─────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const MONTH_TO_NUM: Record<string, number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
};

const MONTH_TO_PAD: Record<string, string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};

function ordinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return `${day}th`;
  switch (day % 10) {
    case 1: return `${day}st`;
    case 2: return `${day}nd`;
    case 3: return `${day}rd`;
    default: return `${day}th`;
  }
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// ─────────────────────────────────────────────
// Date regex
// ─────────────────────────────────────────────

const LONG_DATE_RE =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s*(am|pm)\b/gi;

// ─────────────────────────────────────────────
// Filing date correction
// Window: 8:00 AM – 5:00 PM. Outside → next day 8:00 AM.
// ─────────────────────────────────────────────

interface ParsedDateParts {
  monthName: string;
  day: number;
  year: number;
  hour12: number;
  minute: number;
  meridiem: string;
}

function toMinutesSinceMidnight(parts: ParsedDateParts): number {
  let h = parts.hour12;
  const isPM = parts.meridiem.toLowerCase() === "pm";
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h * 60 + parts.minute;
}

function applyFilingDateRule(parts: ParsedDateParts): ParsedDateParts {
  const mins  = toMinutesSinceMidnight(parts);
  const OPEN  = 8 * 60;   // 480
  const CLOSE = 17 * 60;  // 1020

  if (mins >= OPEN && mins <= CLOSE) return parts;

  let newDay   = parts.day + 1;
  let newMonth = MONTH_TO_NUM[parts.monthName.toLowerCase()];
  let newYear  = parts.year;

  if (newDay > daysInMonth(newMonth, newYear)) {
    newDay = 1;
    newMonth += 1;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
  }

  return {
    monthName: MONTH_NAMES[newMonth - 1].toLowerCase(),
    day: newDay,
    year: newYear,
    hour12: 8,
    minute: 0,
    meridiem: "am",
  };
}

// ─────────────────────────────────────────────
// Combined pipeline: filing correction → short format + initials
//
// This is what the single "Valid Filing Date" toggle runs.
// 1. Parse the long-form date.
// 2. Correct if after-hours.
// 3. Output as MM/DD/YY AT H:MMAM/PM INITIALS
// ─────────────────────────────────────────────

function applyValidFilingConvert(input: string, initials: string): string | null {
  let matched = false;

  const result = input.replace(
    LONG_DATE_RE,
    (_match, monthStr, dayStr, yearStr, hourStr, minStr, merStr) => {
      matched = true;

      const parts: ParsedDateParts = {
        monthName: monthStr.toLowerCase(),
        day:       parseInt(dayStr, 10),
        year:      parseInt(yearStr, 10),
        hour12:    parseInt(hourStr, 10),
        minute:    parseInt(minStr, 10),
        meridiem:  merStr.toLowerCase(),
      };

      const corrected = applyFilingDateRule(parts);

      const month  = MONTH_TO_PAD[corrected.monthName];
      const day    = String(corrected.day).padStart(2, "0");
      const year   = String(corrected.year).slice(-2);
      const hour   = String(corrected.hour12);
      const min    = String(corrected.minute).padStart(2, "0");
      const mer    = corrected.meridiem.toUpperCase();

      const trimmedInits = initials.trim().toUpperCase();
      const suffix = trimmedInits ? ` ${trimmedInits}` : "";

      return `${month}/${day}/${year} AT ${hour}:${min}${mer}${suffix}`;
    }
  );

  return matched ? result : null;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

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
  const [autoCaps,    setAutoCaps]    = useState(false);
  const [trimTo100,   setTrimTo100]   = useState(false);
  const [validFiling, setValidFiling] = useState(false);
  const [initials,    setInitials]    = useState("JO");
  const [copied,      setCopied]      = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardBg      = darkMode ? "#020617" : "white";
  const borderBase  = darkMode ? "#1d4ed8" : "#bfdbfe";
  const accent      = "#3b82f6";
  const amber       = "#f59e0b";
  const textColor   = darkMode ? "#e5e7eb" : "#111827";
  const mutedText   = darkMode ? "#9ca3af" : "#6b7280";
  const inputBg     = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";

  useEffect(() => {
    return () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); };
  }, []);

  function triggerCopied(text: string) {
    copyToClipboardSafe(text);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  // Transform pipeline:
  //  1. Valid Filing Date (correct + convert to short form + initials)
  //  2. Auto CAPS
  //  3. Trim to 100
  function applyTransforms(
    raw: string,
    caps: boolean,
    trim: boolean,
    filing: boolean,
    inits: string,
  ): string {
    let result = raw;

    if (filing) {
      const converted = applyValidFilingConvert(result, inits);
      if (converted !== null) result = converted;
    }

    if (caps) result = result.toUpperCase();
    if (trim) result = result.slice(0, 100);
    return result;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const transformed = applyTransforms(e.target.value, autoCaps, trimTo100, validFiling, initials);
    onSearchChange(transformed);
    if (autoCaps || trimTo100 || validFiling) triggerCopied(transformed);
    else setCopied(false);
  }

  function reapply(overrides: Partial<{
    caps: boolean; trim: boolean; filing: boolean; inits: string;
  }> = {}) {
    if (!search) return;
    const transformed = applyTransforms(
      search,
      overrides.caps   ?? autoCaps,
      overrides.trim   ?? trimTo100,
      overrides.filing ?? validFiling,
      overrides.inits  ?? initials,
    );
    onSearchChange(transformed);
    if (transformed !== search) triggerCopied(transformed);
  }

  function handleAutoCapsToggle(checked: boolean)    { setAutoCaps(checked);    reapply({ caps: checked }); }
  function handleTrimToggle(checked: boolean)        { setTrimTo100(checked);   reapply({ trim: checked }); }
  function handleValidFilingToggle(checked: boolean) { setValidFiling(checked); reapply({ filing: checked }); }
  function handleInitialsBlur()                      { reapply(); }

  async function handleConvertNow() {
    try {
      const text = await navigator.clipboard.readText();
      let result = text;
      if (validFiling) {
        const converted = applyValidFilingConvert(result, initials);
        if (converted !== null) result = converted;
      }
      if (autoCaps)  result = result.toUpperCase();
      if (trimTo100) result = result.slice(0, 100);
      onSearchChange(result);
      triggerCopied(result);
    } catch {}
  }

  function handleClear() { onSearchChange(""); setCopied(false); }

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.35rem",
    fontSize: "0.8rem", color: textColor, cursor: "pointer", userSelect: "none",
  };
  const checkboxStyle: React.CSSProperties = {
    width: "14px", height: "14px", accentColor: accent, cursor: "pointer",
  };

  return (
    <section
      style={{
        width: "100%",
        padding: "0.75rem 1rem",
        borderTopStyle: "solid", borderBottomStyle: "solid",
        borderLeftStyle: "solid", borderRightStyle: "solid",
        borderTopWidth: "2px",   borderBottomWidth: "2px",
        borderLeftWidth: "1px",  borderRightWidth: "1px",
        borderTopColor: accent,  borderBottomColor: accent,
        borderLeftColor: borderBase, borderRightColor: borderBase,
        borderRadius: "10px",
        backgroundColor: cardBg,
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)",
        marginBottom: "0.5rem",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>

        {/* ── Top row ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="search" style={{ fontWeight: 500, color: textColor, fontSize: "0.95rem" }}>
              Search templates
            </label>
            {copied && (
              <span style={{
                fontSize: "0.75rem", fontWeight: 500,
                color: darkMode ? "#4ade80" : "#15803d",
                backgroundColor: darkMode ? "#052e16" : "#f0fdf4",
                border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`,
                borderRadius: "999px", padding: "0.1rem 0.55rem",
              }}>
                ✓ Copied
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button type="button" onClick={onCreateBoard} style={{
              padding: "0.35rem 0.9rem", borderRadius: "999px",
              border: "1px solid #3b82f6",
              backgroundColor: darkMode ? "#020617" : "#eff6ff",
              color: darkMode ? "#bfdbfe" : "#1d4ed8",
              fontSize: "0.8rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
            }}>
              + Create Board
            </button>
            <button type="button" onClick={onToggleCreator} style={{
              padding: "0.35rem 0.9rem", borderRadius: "999px",
              border: `1px solid ${showCreator ? accent : darkMode ? "#4b5563" : "#d1d5db"}`,
              backgroundColor: showCreator ? (darkMode ? "#1e3a5f" : "#eff6ff") : (darkMode ? "#020617" : "white"),
              color: showCreator ? (darkMode ? "#93c5fd" : "#1d4ed8") : textColor,
              fontSize: "0.8rem", fontWeight: 500, cursor: "pointer",
              whiteSpace: "nowrap", transition: "all 0.15s ease",
            }}>
              {showCreator ? "✕ Close Creator" : "+ New Template"}
            </button>
          </div>
        </div>

        {/* ── Search input ── */}
        <input
          id="search" type="text" value={search}
          onChange={handleChange} onFocus={(e) => e.target.select()}
          placeholder="Type to search titles..."
          style={{
            flex: 1, padding: "0.5rem 0.75rem", borderRadius: "6px",
            border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor,
          }}
        />

        {/* ── Toggles row ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.1rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>

            {/* Auto CAPS */}
            <label style={checkboxLabelStyle}>
              <input type="checkbox" checked={autoCaps}
                onChange={(e) => handleAutoCapsToggle(e.target.checked)} style={checkboxStyle} />
              <span>Auto CAPS</span>
              {autoCaps && <span style={{ fontSize: "0.7rem", color: accent }}>on</span>}
            </label>

            {/* Trim to 100 */}
            <label style={checkboxLabelStyle}>
              <input type="checkbox" checked={trimTo100}
                onChange={(e) => handleTrimToggle(e.target.checked)} style={checkboxStyle} />
              <span>Trim to 100</span>
              {trimTo100 && <span style={{ fontSize: "0.7rem", color: accent }}>on</span>}
            </label>

            {/* ── Valid Filing Date (single toggle: corrects + converts) ── */}
            <label style={{ ...checkboxLabelStyle, fontWeight: validFiling ? 600 : 400 }}>
              <input
                type="checkbox"
                checked={validFiling}
                onChange={(e) => handleValidFilingToggle(e.target.checked)}
                style={{ ...checkboxStyle, accentColor: amber }}
              />
              <span style={{ color: validFiling ? amber : textColor }}>Valid Filing Date</span>
              {validFiling && <span style={{ fontSize: "0.7rem", color: amber, fontWeight: 700 }}>on</span>}
            </label>

            {/* Initials + Convert Now — only visible when Valid Filing Date is on */}
            {validFiling && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ fontSize: "0.8rem", color: mutedText }}>Initials:</span>
                <input
                  type="text" value={initials} maxLength={6}
                  onChange={(e) => setInitials(e.target.value.toUpperCase())}
                  onBlur={handleInitialsBlur}
                  placeholder="JO"
                  title="Appended to converted date"
                  style={{
                    width: "3.2rem", padding: "0.2rem 0.4rem", borderRadius: "5px",
                    border: `1px solid ${amber}`,
                    backgroundColor: inputBg, color: textColor,
                    fontSize: "0.8rem", fontFamily: "monospace",
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    outline: `2px solid ${amber}22`,
                    transition: "border-color 0.15s ease",
                  }}
                />
                <button type="button" onClick={handleConvertNow}
                  title="Paste from clipboard, apply Valid Filing Date, copy result"
                  style={{
                    padding: "0.2rem 0.55rem", borderRadius: "999px",
                    border: `1px solid ${amber}`,
                    backgroundColor: darkMode ? "#1c1000" : "#fffbeb",
                    color: darkMode ? "#fcd34d" : "#b45309",
                    fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                  }}>
                  ⇄ Convert Now
                </button>
              </div>
            )}

            {/* Char count */}
            {trimTo100 && search.length > 0 && (
              <span style={{ fontSize: "0.75rem", color: search.length >= 100 ? "#b91c1c" : mutedText }}>
                {search.length}/100
              </span>
            )}
          </div>

          {/* Clear */}
          {search.trim().length > 0 && (
            <button type="button" onClick={handleClear} style={{
              padding: "0.3rem 0.85rem", borderRadius: "999px",
              border: "1px solid #fca5a5",
              backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5",
              color: darkMode ? "#fca5a5" : "#dc2626",
              fontSize: "0.78rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap",
            }}>
              Clear Search Bar
            </button>
          )}
        </div>

        {/* ── Hint line ── */}
        {validFiling && (
          <p style={{ margin: 0, fontSize: "0.72rem", color: mutedText, fontStyle: "italic", paddingTop: "0.1rem" }}>
            After-hours dates → next day 8:00AM • converts to MM/DD/YY AT H:MMAM {initials.trim().toUpperCase() || "??"} — auto-copied
          </p>
        )}

        {/* ── Search scope ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: mutedText }}>
          <span>Search in:</span>
          <select value={searchScopeBoardId} onChange={(e) => onSearchScopeChange(e.target.value)} style={{
            padding: "0.25rem 0.6rem", borderRadius: "999px",
            border: "1px solid #9ca3af",
            backgroundColor: darkMode ? "#020617" : "white",
            color: textColor, fontSize: "0.8rem",
          }}>
            <option value="all">All boards</option>
            {boards.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}