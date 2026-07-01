import React, { useState, useEffect, useRef } from "react";

type Page  = { id: string; name: string; };
type Board = { id: string; name: string; pageId: string; };

type SearchBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  darkMode: boolean;
  pages: Page[];
  boards: Board[];
  searchScopeType: "all" | "page" | "board";
  searchScopeId: string;
  onSearchScopeChange: (type: "all" | "page" | "board", id: string) => void;
  showCreator: boolean;
  onToggleCreator: () => void;
  onCreateBoard: () => void;
  onCreateWorkflow: () => void;
  // onDateModeChange removed — search always works now regardless of filing mode
};

// ─────────────────────────────────────────────
// Clipboard helpers
// ─────────────────────────────────────────────

function copyToClipboardSafe(text: string) {
  if (typeof window === "undefined") return;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}
function fallbackCopy(value: string) {
  try {
    const ta = document.createElement("textarea");
    ta.value = value; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  } catch {}
}

// ─────────────────────────────────────────────
// Month helpers
// ─────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_TO_NUM: Record<string,number> = {
  january:1,february:2,march:3,april:4,may:5,june:6,
  july:7,august:8,september:9,october:10,november:11,december:12,
};
const MONTH_TO_PAD: Record<string,string> = {
  january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",
  july:"07",august:"08",september:"09",october:"10",november:"11",december:"12",
};
function daysInMonth(month: number, year: number) { return new Date(year, month, 0).getDate(); }

// ─────────────────────────────────────────────
// Date regex
// ─────────────────────────────────────────────

const LONG_DATE_RE = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)\b/gi;
const LONG_DATE_RE_SINGLE = /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)\b/i;
const TRAILING_INITIALS_RE = /^(.*?AT\s+\d{1,2}:\d{2}(?:AM|PM))(\s*)([A-Za-z]*)$/;

// ─────────────────────────────────────────────
// Filing date logic — weekend-aware
//
// Filing window: Mon–Fri 8:00 AM – 5:00 PM.
// Outside that window → next valid BUSINESS DAY at 8:00 AM.
//   • After 5 PM Friday  → Monday 8:00 AM
//   • Saturday any time  → Monday 8:00 AM
//   • Sunday any time    → Monday 8:00 AM
//   • After 5 PM Mon–Thu → next day 8:00 AM
//   • Before 8 AM Mon–Fri → same day 8:00 AM
// ─────────────────────────────────────────────

interface ParsedDateParts {
  monthName: string; day: number; year: number;
  hour12: number; minute: number; meridiem: string;
}

function toMinutes(parts: ParsedDateParts): number {
  let h = parts.hour12;
  const isPM = parts.meridiem.toLowerCase() === "pm";
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h * 60 + parts.minute;
}

function advanceDate(day: number, month: number, year: number, by: number): { day: number; month: number; year: number } {
  let d = day + by;
  let m = month;
  let y = year;
  while (d > daysInMonth(m, y)) { d -= daysInMonth(m, y); m++; if (m > 12) { m = 1; y++; } }
  return { day: d, month: m, year: y };
}

function applyFilingDateRule(parts: ParsedDateParts): ParsedDateParts {
  const OPEN  = 8 * 60;
  const CLOSE = 17 * 60;
  const mins  = toMinutes(parts);

  let { day, year } = parts;
  let month = MONTH_TO_NUM[parts.monthName.toLowerCase()];

  // Compute day-of-week for the input date (0 = Sun, 1 = Mon … 6 = Sat)
  const dow = new Date(year, month - 1, day).getDay();

  const isWeekend   = dow === 0 || dow === 6;          // Sat or Sun
  const isAfterHours = mins > CLOSE;
  const isBeforeOpen = mins < OPEN;
  const isFriday    = dow === 5;

  let needsAdvance = false;
  let daysToAdd    = 0;

  if (isWeekend) {
    // Saturday → +2 to Monday; Sunday → +1 to Monday
    needsAdvance = true;
    daysToAdd = dow === 6 ? 2 : 1;
  } else if (isAfterHours) {
    if (isFriday) {
      // After 5 PM Friday → Monday (+3)
      needsAdvance = true;
      daysToAdd = 3;
    } else {
      // After 5 PM Mon–Thu → next weekday (+1; never lands on weekend since Thu+1=Fri)
      needsAdvance = true;
      daysToAdd = 1;
    }
  } else if (isBeforeOpen) {
    // Before 8 AM any weekday → same day 8:00 AM (no day advance needed)
    needsAdvance = false;
  }

  if (!needsAdvance && !isBeforeOpen) return parts; // within window

  if (needsAdvance) {
    const next = advanceDate(day, month, year, daysToAdd);
    day = next.day; month = next.month; year = next.year;
  }

  return {
    monthName: MONTH_NAMES[month - 1].toLowerCase(),
    day, year, hour12: 8, minute: 0, meridiem: "am",
  };
}

function applyValidFilingConvert(input: string, initials: string): string | null {
  let matched = false;
  const result = input.replace(LONG_DATE_RE, (_m, monthStr, dayStr, yearStr, hourStr, minStr, merStr) => {
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
  });
  return matched ? result : null;
}

function formatNowConverted(initials: string): string {
  // Apply filing rule to right now
  const now = new Date();
  const parts: ParsedDateParts = {
    monthName: MONTH_NAMES[now.getMonth()].toLowerCase(),
    day: now.getDate(), year: now.getFullYear(),
    hour12: now.getHours() === 0 ? 12 : now.getHours() > 12 ? now.getHours() - 12 : now.getHours(),
    minute: now.getMinutes(),
    meridiem: now.getHours() >= 12 ? "pm" : "am",
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

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function SearchBar({
  search, onSearchChange, darkMode,
  pages, boards,
  searchScopeType, searchScopeId, onSearchScopeChange,
  showCreator, onToggleCreator, onCreateBoard, onCreateWorkflow,
}: SearchBarProps) {
  const [autoCaps,    setAutoCaps]    = useState(false);
  const [trimTo100,   setTrimTo100]   = useState(false);
  const [validFiling, setValidFiling] = useState(false);
  const [initials,    setInitials]    = useState("JO");
  const [dateInput,   setDateInput]   = useState("");  // right-side date field (independent)
  const [copied,      setCopied]      = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasConvertedDateRef = useRef(false);

  const cardBg      = darkMode ? "#020617" : "white";
  const borderBase  = darkMode ? "#1d4ed8" : "#bfdbfe";
  const accent      = "#3b82f6";
  const amber       = "#f59e0b";
  const textColor   = darkMode ? "#e5e7eb" : "#111827";
  const mutedText   = darkMode ? "#9ca3af" : "#6b7280";
  const inputBg     = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";
  const amberBg     = darkMode ? "#1c1000" : "#fffbeb";
  const amberText   = darkMode ? "#fcd34d" : "#b45309";

  useEffect(() => () => { if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current); }, []);

  // Clear date input when filing mode turns off
  useEffect(() => {
    if (!validFiling) { setDateInput(""); hasConvertedDateRef.current = false; }
  }, [validFiling]);

  function triggerCopied(text: string) {
    copyToClipboardSafe(text);
    setCopied(true);
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }

  // ── Left side: normal search with caps/trim ──
  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    let val = e.target.value;
    if (autoCaps)  val = val.toUpperCase();
    if (trimTo100) val = val.slice(0, 100);
    onSearchChange(val);
    if (autoCaps || trimTo100) triggerCopied(val);
    else setCopied(false);
  }

  function handleAutoCapsToggle(checked: boolean) {
    setAutoCaps(checked);
    if (search && checked) { const r = trimTo100 ? search.toUpperCase().slice(0, 100) : search.toUpperCase(); onSearchChange(r); }
  }
  function handleTrimToggle(checked: boolean) {
    setTrimTo100(checked);
    if (search && checked) { const r = autoCaps ? search.slice(0, 100).toUpperCase() : search.slice(0, 100); onSearchChange(r); }
  }

  // ── Right side: date input field — auto-converts on match ──
  function handleDateInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    setDateInput(raw);
    hasConvertedDateRef.current = false;

    if (LONG_DATE_RE_SINGLE.test(raw)) {
      const converted = applyValidFilingConvert(raw, initials);
      if (converted) {
        setDateInput(converted);
        hasConvertedDateRef.current = true;
        triggerCopied(converted);
      }
    }
  }

  function handleInitialsChange(raw: string) {
    const upper = raw.toUpperCase();
    setInitials(upper);
    // If there's already a converted result, splice in the new initials
    if (hasConvertedDateRef.current) {
      const match = dateInput.match(TRAILING_INITIALS_RE);
      if (match) {
        const base = match[1];
        const newVal = upper ? `${base} ${upper}` : base;
        setDateInput(newVal);
        triggerCopied(newVal);
      }
    }
  }

  function handleConvertNow() {
    if (!dateInput.trim()) return;
    const converted = applyValidFilingConvert(dateInput, initials);
    if (converted) {
      setDateInput(converted);
      hasConvertedDateRef.current = true;
      triggerCopied(converted);
    } else {
      // Already converted or unrecognized — copy as-is
      triggerCopied(dateInput);
    }
  }

  function handleUseCurrentDateTime() {
    const result = formatNowConverted(initials);
    setDateInput(result);
    hasConvertedDateRef.current = true;
    triggerCopied(result);
  }

  function handleClearDate() { setDateInput(""); hasConvertedDateRef.current = false; setCopied(false); }
  function handleClearSearch() { onSearchChange(""); setCopied(false); }

  // ── Scope dropdown ──
  function handleScopeChange(value: string) {
    if (value === "all")               { onSearchScopeChange("all",   "all");          return; }
    if (value.startsWith("page:"))     { onSearchScopeChange("page",  value.slice(5)); return; }
    if (value.startsWith("board:"))    { onSearchScopeChange("board", value.slice(6)); return; }
  }
  function scopeValue() {
    if (searchScopeType === "all")  return "all";
    if (searchScopeType === "page") return `page:${searchScopeId}`;
    return `board:${searchScopeId}`;
  }

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

  const checkboxLabel: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.35rem",
    fontSize: "0.78rem", color: textColor, cursor: "pointer", userSelect: "none",
  };
  const chkStyle: React.CSSProperties = { width: "13px", height: "13px", accentColor: accent, cursor: "pointer" };
  const amberBtn: React.CSSProperties = {
    padding: "0.25rem 0.6rem", borderRadius: "999px",
    border: `1px solid ${amber}`, backgroundColor: amberBg,
    color: amberText, fontSize: "0.72rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
  };

  return (
    <section style={{
      width: "100%", padding: "0.75rem 1rem",
      borderTopStyle: "solid", borderBottomStyle: "solid",
      borderLeftStyle: "solid", borderRightStyle: "solid",
      borderTopWidth: "2px", borderBottomWidth: "2px",
      borderLeftWidth: "1px", borderRightWidth: "1px",
      borderTopColor: validFiling ? amber : accent,
      borderBottomColor: validFiling ? amber : accent,
      borderLeftColor: borderBase, borderRightColor: borderBase,
      borderRadius: "10px", backgroundColor: cardBg,
      boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)", marginBottom: "0.5rem",
      transition: "border-color 0.2s ease",
    }}>

      {/* ── Top row: labels + action buttons ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem", gap: "0.5rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: 500, color: textColor, fontSize: "0.95rem" }}>Search templates</span>
          {copied && (
            <span style={{ fontSize: "0.72rem", fontWeight: 500, color: darkMode ? "#4ade80" : "#15803d", backgroundColor: darkMode ? "#052e16" : "#f0fdf4", border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`, borderRadius: "999px", padding: "0.1rem 0.5rem" }}>
              ✓ Copied
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <button type="button" onClick={onCreateBoard}
            style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: "1px solid #3b82f6", backgroundColor: darkMode ? "#020617" : "#eff6ff", color: darkMode ? "#bfdbfe" : "#1d4ed8", fontSize: "0.78rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
            + Create Board
          </button>
          <button type="button" onClick={onCreateWorkflow}
            style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: "1px solid #7c3aed", backgroundColor: darkMode ? "#020617" : "#f5f3ff", color: darkMode ? "#c4b5fd" : "#6d28d9", fontSize: "0.78rem", cursor: "pointer", fontWeight: 500, whiteSpace: "nowrap" }}>
            + Add Workflow
          </button>
          <button type="button" onClick={onToggleCreator}
            style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: `1px solid ${showCreator ? accent : darkMode ? "#4b5563" : "#d1d5db"}`, backgroundColor: showCreator ? (darkMode ? "#1e3a5f" : "#eff6ff") : (darkMode ? "#020617" : "white"), color: showCreator ? (darkMode ? "#93c5fd" : "#1d4ed8") : textColor, fontSize: "0.78rem", fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s ease" }}>
            {showCreator ? "✕ Close Creator" : "+ New Template"}
          </button>
        </div>
      </div>

      {/* ── Main body: split when filing is on, single column when off ── */}
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>

        {/* ── LEFT: Search ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 0 }}>
          <input
            id="search" type="text" value={search}
            onChange={handleSearchChange}
            onFocus={(e) => e.target.select()}
            placeholder="Type to search titles..."
            style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor, boxSizing: "border-box" }}
          />

          {/* Toggles + scope */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <label style={checkboxLabel}>
                <input type="checkbox" checked={autoCaps} onChange={(e) => handleAutoCapsToggle(e.target.checked)} style={chkStyle} />
                Auto CAPS {autoCaps && <span style={{ fontSize: "0.68rem", color: accent }}>on</span>}
              </label>
              <label style={checkboxLabel}>
                <input type="checkbox" checked={trimTo100} onChange={(e) => handleTrimToggle(e.target.checked)} style={chkStyle} />
                Trim 100 {trimTo100 && <span style={{ fontSize: "0.68rem", color: accent }}>on</span>}
              </label>
              {/* Valid Filing Date toggle lives on the left so it controls the split */}
              <label style={{ ...checkboxLabel, fontWeight: validFiling ? 600 : 400 }}>
                <input type="checkbox" checked={validFiling} onChange={(e) => setValidFiling(e.target.checked)} style={{ ...chkStyle, accentColor: amber }} />
                <span style={{ color: validFiling ? amber : textColor }}>Valid Filing Date</span>
                {validFiling && <span style={{ fontSize: "0.68rem", color: amber, fontWeight: 700 }}>on</span>}
              </label>
              {trimTo100 && search.length > 0 && (
                <span style={{ fontSize: "0.72rem", color: search.length >= 100 ? "#b91c1c" : mutedText }}>{search.length}/100</span>
              )}
            </div>
            {search.trim().length > 0 && (
              <button type="button" onClick={handleClearSearch}
                style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.72rem", cursor: "pointer", fontWeight: 500 }}>
                Clear
              </button>
            )}
          </div>

          {/* Scope selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: mutedText }}>
            <span>Search in:</span>
            <select value={scopeValue()} onChange={(e) => handleScopeChange(e.target.value)}
              style={{ padding: "0.2rem 0.5rem", borderRadius: "999px", border: "1px solid #9ca3af", backgroundColor: darkMode ? "#020617" : "white", color: textColor, fontSize: "0.78rem" }}>
              <option value="all">All pages</option>
              {sortedPages.map((page) => {
                const pageBoards = boardsForPage(page.id);
                return (
                  <optgroup key={page.id} label={`── ${page.name} ──`}>
                    <option value={`page:${page.id}`}>All of {page.name}</option>
                    {pageBoards.map((b) => (
                      <option key={b.id} value={`board:${b.id}`}>&nbsp;&nbsp;{b.name}</option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
        </div>

        {/* ── RIGHT: Date converter — only shown when Valid Filing Date is on ── */}
        {validFiling && (
          <div style={{
            flex: 1, minWidth: 0,
            borderLeft: `2px solid ${amber}`,
            paddingLeft: "0.75rem",
            display: "flex", flexDirection: "column", gap: "0.35rem",
          }}>
            {/* Label row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: amber }}>📅 Valid Filing Date</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.72rem", color: mutedText }}>Initials:</span>
                <input type="text" value={initials} maxLength={6}
                  onChange={(e) => handleInitialsChange(e.target.value)}
                  placeholder="JO"
                  style={{ width: "2.8rem", padding: "0.2rem 0.4rem", borderRadius: "5px", border: `1px solid ${amber}`, backgroundColor: inputBg, color: textColor, fontSize: "0.78rem", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em" }}
                />
              </div>
            </div>

            {/* Date input field */}
            <input
              type="text" value={dateInput}
              onChange={handleDateInputChange}
              onFocus={(e) => e.target.select()}
              placeholder="January 15, 2026 1:00 PM"
              style={{ width: "100%", padding: "0.5rem 0.7rem", borderRadius: "6px", border: `1px solid ${amber}`, backgroundColor: hasConvertedDateRef.current ? (darkMode ? "#1c1000" : "#fffbeb") : inputBg, color: textColor, boxSizing: "border-box", fontFamily: hasConvertedDateRef.current ? "monospace" : "inherit", fontSize: "0.88rem", transition: "background-color 0.2s ease" }}
            />

            {/* Action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
              <button type="button" onClick={handleConvertNow} style={amberBtn}>⇄ Convert</button>
              <button type="button" onClick={handleUseCurrentDateTime} style={amberBtn}>🕐 Now</button>
              {dateInput.trim().length > 0 && (
                <button type="button" onClick={handleClearDate}
                  style={{ padding: "0.25rem 0.6rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.72rem", cursor: "pointer", fontWeight: 500 }}>
                  Clear
                </button>
              )}
            </div>

            {/* Hint */}
            <p style={{ margin: 0, fontSize: "0.68rem", color: mutedText, fontStyle: "italic", lineHeight: 1.4 }}>
              After-hours → next business day 8:00AM (Fri after 5PM → Monday). Auto-copies on match.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}