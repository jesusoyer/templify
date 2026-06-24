import React, { useState, useEffect, useRef } from "react";

type Page = {
  id: string;
  name: string;
};

type Board = {
  id: string;
  name: string;
  pageId: string;
};

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  darkMode: boolean;

  // Pages + boards for scope selector
  pages: Page[];
  boards: Board[];
  searchScopeType: "all" | "page" | "board";
  searchScopeId: string;
  onSearchScopeChange: (type: "all" | "page" | "board", id: string) => void;

  // Creator toggle
  showCreator: boolean;
  onToggleCreator: () => void;

  // Create board (in active page)
  onCreateBoard: () => void;

  // Tells parent whether the search box should be treated as a
  // date-conversion tool right now (true) instead of a template filter.
  onDateModeChange?: (active: boolean) => void;
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

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

// ─────────────────────────────────────────────
// Date regex
// ─────────────────────────────────────────────

const LONG_DATE_RE =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)\b/gi;

// Non-global version for single full-string match checks (auto-convert detection)
const LONG_DATE_RE_SINGLE =
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)\b/i;

// Matches the trailing initials token in an already-converted string, e.g.
// "01/15/2026 AT 1:00PM JO" → captures "JO". Works with 0+ trailing letters.
const TRAILING_INITIALS_RE = /^(.*?AT\s+\d{1,2}:\d{2}(?:AM|PM))(\s*)([A-Za-z]*)$/;

// ─────────────────────────────────────────────
// Filing date logic
// ─────────────────────────────────────────────

interface ParsedDateParts {
  monthName: string; day: number; year: number;
  hour12: number; minute: number; meridiem: string;
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
  const OPEN  = 8 * 60;
  const CLOSE = 17 * 60;
  if (mins >= OPEN && mins <= CLOSE) return parts;

  let newDay   = parts.day + 1;
  let newMonth = MONTH_TO_NUM[parts.monthName.toLowerCase()];
  let newYear  = parts.year;
  if (newDay > daysInMonth(newMonth, newYear)) {
    newDay = 1; newMonth += 1;
    if (newMonth > 12) { newMonth = 1; newYear += 1; }
  }
  return { monthName: MONTH_NAMES[newMonth - 1].toLowerCase(), day: newDay, year: newYear, hour12: 8, minute: 0, meridiem: "am" };
}

function applyValidFilingConvert(input: string, initials: string): string | null {
  let matched = false;
  const result = input.replace(
    LONG_DATE_RE,
    (_match, monthStr, dayStr, yearStr, hourStr, minStr, merStr) => {
      matched = true;
      const parts: ParsedDateParts = {
        monthName: monthStr.toLowerCase(), day: parseInt(dayStr, 10),
        year: parseInt(yearStr, 10), hour12: parseInt(hourStr, 10),
        minute: parseInt(minStr, 10), meridiem: merStr.toLowerCase(),
      };
      const corrected = applyFilingDateRule(parts);
      const month = MONTH_TO_PAD[corrected.monthName];
      const day   = String(corrected.day).padStart(2, "0");
      const year  = String(corrected.year);
      const hour  = String(corrected.hour12);
      const min   = String(corrected.minute).padStart(2, "0");
      const mer   = corrected.meridiem.toUpperCase();
      const suffix = initials.trim().toUpperCase() ? ` ${initials.trim().toUpperCase()}` : "";
      return `${month}/${day}/${year} AT ${hour}:${min}${mer}${suffix}`;
    }
  );
  return matched ? result : null;
}

function formatNowConverted(initials: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");
  const year  = String(now.getFullYear());

  let hour12 = now.getHours() % 12;
  if (hour12 === 0) hour12 = 12;
  const min = String(now.getMinutes()).padStart(2, "0");
  const mer = now.getHours() >= 12 ? "PM" : "AM";

  const suffix = initials.trim().toUpperCase() ? ` ${initials.trim().toUpperCase()}` : "";
  return `${month}/${day}/${year} AT ${hour12}:${min}${mer}${suffix}`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function SearchBar({
  search, onSearchChange, darkMode,
  pages, boards,
  searchScopeType, searchScopeId, onSearchScopeChange,
  showCreator, onToggleCreator, onCreateBoard,
  onDateModeChange,
}: SearchBarProps) {
  const [autoCaps,    setAutoCaps]    = useState(false);
  const [trimTo100,   setTrimTo100]   = useState(false);
  const [validFiling, setValidFiling] = useState(false);
  const [initials,    setInitials]    = useState("JO");
  const [copied,      setCopied]      = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tracks whether the search bar currently holds an *already converted*
  // string (so we know to keep the trailing initials token in sync rather
  // than re-running conversion on it).
  const hasConvertedRef = useRef(false);

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

  // Tell the parent whether the search bar is currently a date-conversion
  // tool (Valid Filing Date on) so it can stop filtering templates by it.
  useEffect(() => {
    onDateModeChange?.(validFiling);
  }, [validFiling]); // eslint-disable-line react-hooks/exhaustive-deps

  function triggerCopied(text: string) {
    copyToClipboardSafe(text);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  function applyTransforms(raw: string, caps: boolean, trim: boolean, filing: boolean, inits: string): string {
    let result = raw;
    if (filing) {
      const converted = applyValidFilingConvert(result, inits);
      if (converted !== null) result = converted;
    }
    if (caps) result = result.toUpperCase();
    if (trim) result = result.slice(0, 100);
    return result;
  }

  // ── Main input handler ──
  // While Valid Filing Date is on:
  //   1. If the typed text fully matches the long-form date pattern, auto-convert immediately.
  //   2. If the text already looks like a converted result (MM/DD/YYYY AT H:MM AM/PM ...),
  //      treat anything after the time as the live initials and mirror it into the
  //      Initials box as the user types/erases it.
  //   3. Otherwise just pass the raw text through (still typing the date, not done yet).
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    if (!validFiling) {
      // Normal mode — only caps/trim apply, no date logic
      const transformed = applyTransforms(raw, autoCaps, trimTo100, false, initials);
      onSearchChange(transformed);
      if (autoCaps || trimTo100) triggerCopied(transformed);
      else setCopied(false);
      return;
    }

    // ── Valid Filing Date is ON ──

    // Case 1: text matches the long-form input pattern → auto-convert now
    if (LONG_DATE_RE_SINGLE.test(raw)) {
      const converted = applyValidFilingConvert(raw, initials);
      if (converted !== null) {
        let result = converted;
        if (autoCaps)  result = result.toUpperCase();
        if (trimTo100) result = result.slice(0, 100);
        hasConvertedRef.current = true;
        onSearchChange(result);
        triggerCopied(result);
        return;
      }
    }

    // Case 2: text already looks converted (has "AT H:MM AM/PM" in it) →
    // whatever comes after that is the live initials segment. Mirror it.
    const trailingMatch = raw.match(TRAILING_INITIALS_RE);
    if (hasConvertedRef.current && trailingMatch) {
      const typedInitials = trailingMatch[3] ?? "";
      setInitials(typedInitials.toUpperCase());
      let result = raw;
      if (autoCaps)  result = result.toUpperCase();
      if (trimTo100) result = result.slice(0, 100);
      onSearchChange(result);
      return;
    }

    // Case 3: still typing the long-form date, not matched yet — pass through raw
    hasConvertedRef.current = false;
    let result = raw;
    if (autoCaps)  result = result.toUpperCase();
    if (trimTo100) result = result.slice(0, 100);
    onSearchChange(result);
  }

  function reapply(overrides: Partial<{ caps: boolean; trim: boolean; filing: boolean; inits: string }> = {}) {
    if (!search) return;
    const filing = overrides.filing ?? validFiling;
    const inits  = overrides.inits  ?? initials;

    // If filing mode just turned on and the search box holds a raw long-form
    // date, convert it immediately.
    if (filing) {
      const converted = applyValidFilingConvert(search, inits);
      if (converted !== null) {
        let result = converted;
        if (overrides.caps ?? autoCaps) result = result.toUpperCase();
        if (overrides.trim ?? trimTo100) result = result.slice(0, 100);
        hasConvertedRef.current = true;
        onSearchChange(result);
        if (result !== search) triggerCopied(result);
        return;
      }
    }

    const transformed = applyTransforms(
      search,
      overrides.caps ?? autoCaps,
      overrides.trim ?? trimTo100,
      filing,
      inits,
    );
    onSearchChange(transformed);
    if (transformed !== search) triggerCopied(transformed);
  }

  function handleAutoCapsToggle(checked: boolean)    { setAutoCaps(checked);    reapply({ caps: checked }); }
  function handleTrimToggle(checked: boolean)        { setTrimTo100(checked);   reapply({ trim: checked }); }
  function handleValidFilingToggle(checked: boolean) { setValidFiling(checked); reapply({ filing: checked }); }

  // ── Initials box: live-typed here mirrors into the search bar's trailing token ──
  function handleInitialsLiveChange(rawValue: string) {
    const upper = rawValue.toUpperCase();
    setInitials(upper);

    if (!hasConvertedRef.current) return; // nothing converted yet, nothing to splice into

    const trailingMatch = search.match(TRAILING_INITIALS_RE);
    if (!trailingMatch) return;

    const base = trailingMatch[1]; // e.g. "01/15/2026 AT 1:00PM"
    const newValue = upper ? `${base} ${upper}` : base;
    let result = newValue;
    if (autoCaps)  result = result.toUpperCase();
    if (trimTo100) result = result.slice(0, 100);
    onSearchChange(result);
  }

  function handleConvertNow() {
    // Converts whatever is currently sitting in the search bar — no clipboard read,
    // so this works every time, not just the first click.
    let result = search;
    if (validFiling) {
      const converted = applyValidFilingConvert(search, initials);
      if (converted !== null) { result = converted; hasConvertedRef.current = true; }
    }
    if (autoCaps)  result = result.toUpperCase();
    if (trimTo100) result = result.slice(0, 100);
    onSearchChange(result);
    triggerCopied(result);
  }

  function handleUseCurrentDateTime() {
    let result = formatNowConverted(initials);
    if (autoCaps)  result = result.toUpperCase();
    if (trimTo100) result = result.slice(0, 100);
    hasConvertedRef.current = true;
    onSearchChange(result);
    triggerCopied(result);
  }

  function handleClear() { onSearchChange(""); setCopied(false); hasConvertedRef.current = false; }

  // ── Scope dropdown: build a flat option list ──
  // Structure: All pages → [Page: X → boards in X...] for each page
  function handleScopeChange(value: string) {
    if (value === "all") { onSearchScopeChange("all", "all"); return; }
    if (value.startsWith("page:")) { onSearchScopeChange("page", value.slice(5)); return; }
    if (value.startsWith("board:")) { onSearchScopeChange("board", value.slice(6)); return; }
  }

  function scopeValue(): string {
    if (searchScopeType === "all")   return "all";
    if (searchScopeType === "page")  return `page:${searchScopeId}`;
    return `board:${searchScopeId}`;
  }

  // Sort pages: Home first, rest alpha
  const sortedPages = [
    ...pages.filter((p) => p.id === "home-page"),
    ...pages.filter((p) => p.id !== "home-page").sort((a, b) => a.name.localeCompare(b.name)),
  ];

  function boardsForPage(pageId: string): Board[] {
    const pb = boards.filter((b) => b.pageId === pageId);
    return [
      ...pb.filter((b) => b.id === "home-board"),
      ...pb.filter((b) => b.id !== "home-board").sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }

  const checkboxLabelStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.35rem",
    fontSize: "0.8rem", color: textColor, cursor: "pointer", userSelect: "none",
  };
  const checkboxStyle: React.CSSProperties = {
    width: "14px", height: "14px", accentColor: accent, cursor: "pointer",
  };

  return (
    <section style={{
      width: "100%", padding: "0.75rem 1rem",
      borderTopStyle: "solid", borderBottomStyle: "solid",
      borderLeftStyle: "solid", borderRightStyle: "solid",
      borderTopWidth: "2px", borderBottomWidth: "2px",
      borderLeftWidth: "1px", borderRightWidth: "1px",
      borderTopColor: accent, borderBottomColor: accent,
      borderLeftColor: borderBase, borderRightColor: borderBase,
      borderRadius: "10px", backgroundColor: cardBg,
      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)", marginBottom: "0.5rem",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>

        {/* ── Top row ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label htmlFor="search" style={{ fontWeight: 500, color: validFiling ? amber : textColor, fontSize: "0.95rem" }}>
              {validFiling ? "Date converter (search disabled)" : "Search templates"}
            </label>
            {copied && (
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: darkMode ? "#4ade80" : "#15803d", backgroundColor: darkMode ? "#052e16" : "#f0fdf4", border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`, borderRadius: "999px", padding: "0.1rem 0.55rem" }}>
                ✓ Copied
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button type="button" onClick={onCreateBoard} style={{ padding: "0.35rem 0.9rem", borderRadius: "999px", border: "1px solid #3b82f6", backgroundColor: darkMode ? "#020617" : "#eff6ff", color: darkMode ? "#bfdbfe" : "#1d4ed8", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
              + Create Board
            </button>
            <button type="button" onClick={onToggleCreator} style={{ padding: "0.35rem 0.9rem", borderRadius: "999px", border: `1px solid ${showCreator ? accent : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: showCreator ? (darkMode ? "#1e3a5f" : "#eff6ff") : (darkMode ? "#020617" : "white"), color: showCreator ? (darkMode ? "#93c5fd" : "#1d4ed8") : textColor, fontSize: "0.8rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s ease" }}>
              {showCreator ? "✕ Close Creator" : "+ New Template"}
            </button>
          </div>
        </div>

        {/* ── Search input ── */}
        <input id="search" type="text" value={search} onChange={handleChange}
          onFocus={(e) => e.target.select()}
          placeholder={validFiling ? `Type a date: January 15, 2026 1:00 PM` : "Type to search titles..."}
          style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "6px", border: `1px solid ${validFiling ? amber : inputBorder}`, backgroundColor: inputBg, color: textColor }} />

        {/* ── Toggles row ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", paddingTop: "0.1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>

            <label style={checkboxLabelStyle}>
              <input type="checkbox" checked={autoCaps} onChange={(e) => handleAutoCapsToggle(e.target.checked)} style={checkboxStyle} />
              <span>Auto CAPS</span>
              {autoCaps && <span style={{ fontSize: "0.7rem", color: accent }}>on</span>}
            </label>

            <label style={checkboxLabelStyle}>
              <input type="checkbox" checked={trimTo100} onChange={(e) => handleTrimToggle(e.target.checked)} style={checkboxStyle} />
              <span>Trim to 100</span>
              {trimTo100 && <span style={{ fontSize: "0.7rem", color: accent }}>on</span>}
            </label>

            <label style={{ ...checkboxLabelStyle, fontWeight: validFiling ? 600 : 400 }}>
              <input type="checkbox" checked={validFiling} onChange={(e) => handleValidFilingToggle(e.target.checked)} style={{ ...checkboxStyle, accentColor: amber }} />
              <span style={{ color: validFiling ? amber : textColor }}>Valid Filing Date</span>
              {validFiling && <span style={{ fontSize: "0.7rem", color: amber, fontWeight: 700 }}>on</span>}
            </label>

            {validFiling && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <span style={{ fontSize: "0.8rem", color: mutedText }}>Initials:</span>
                <input type="text" value={initials} maxLength={6}
                  onChange={(e) => handleInitialsLiveChange(e.target.value)}
                  placeholder="JO"
                  style={{ width: "3.2rem", padding: "0.2rem 0.4rem", borderRadius: "5px", border: `1px solid ${amber}`, backgroundColor: inputBg, color: textColor, fontSize: "0.8rem", fontFamily: "monospace", letterSpacing: "0.05em", textTransform: "uppercase", outline: `2px solid ${amber}22` }} />
                <button type="button" onClick={handleConvertNow}
                  style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${amber}`, backgroundColor: darkMode ? "#1c1000" : "#fffbeb", color: darkMode ? "#fcd34d" : "#b45309", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  ⇄ Convert Now
                </button>
                <button type="button" onClick={handleUseCurrentDateTime}
                  title="Insert the current date and time, converted and with initials"
                  style={{ padding: "0.2rem 0.55rem", borderRadius: "999px", border: `1px solid ${amber}`, backgroundColor: darkMode ? "#1c1000" : "#fffbeb", color: darkMode ? "#fcd34d" : "#b45309", fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                  🕐 Current converted date and time
                </button>
              </div>
            )}

            {trimTo100 && search.length > 0 && (
              <span style={{ fontSize: "0.75rem", color: search.length >= 100 ? "#b91c1c" : mutedText }}>
                {search.length}/100
              </span>
            )}
          </div>

          {search.trim().length > 0 && (
            <button type="button" onClick={handleClear} style={{ padding: "0.3rem 0.85rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.78rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
              Clear Search Bar
            </button>
          )}
        </div>

        {validFiling && (
          <p style={{ margin: 0, fontSize: "0.72rem", color: mutedText, fontStyle: "italic", paddingTop: "0.1rem" }}>
            Template search is paused. Type "January 15, 2026 1:00 PM" to auto-convert • after-hours → next day 8:00AM • initials sync live with the box below — auto-copied
          </p>
        )}

        {/* ── Search scope ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: mutedText }}>
          <span>Search in:</span>
          <select value={scopeValue()} onChange={(e) => handleScopeChange(e.target.value)}
            style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", border: "1px solid #9ca3af", backgroundColor: darkMode ? "#020617" : "white", color: textColor, fontSize: "0.8rem" }}>
            <option value="all">All pages</option>
            {sortedPages.map((page) => {
              const pageBoards = boardsForPage(page.id);
              return (
                <optgroup key={page.id} label={`── ${page.name} ──`}>
                  <option value={`page:${page.id}`}>All of {page.name}</option>
                  {pageBoards.map((b) => (
                    <option key={b.id} value={`board:${b.id}`}>
                      &nbsp;&nbsp;{b.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

      </div>
    </section>
  );
}