"use client";

import React, { useEffect, useState } from "react";
import TemplateCreator from "./components/TemplateCreator";
import SearchBar from "./components/SearchBar";
import TemplatesGrid from "./components/TemplatesGrid";

type Template = {
  id: string;
  title: string;
  body: string;
};

export default function ClipboardTemplatesPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  // Show/hide creator
  const [showCreator, setShowCreator] = useState(true);

  // NEW: dark mode
  const [darkMode, setDarkMode] = useState(false);

  // NEW: track which template was just added
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  // Load from localStorage on first render
  useEffect(() => {
    try {
      const stored = localStorage.getItem("clipboard-templates");
      if (stored) {
        setTemplates(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Failed to load templates from localStorage", err);
    }
  }, []);

  // Save to localStorage whenever templates change
  useEffect(() => {
    try {
      localStorage.setItem("clipboard-templates", JSON.stringify(templates));
    } catch (err) {
      console.error("Failed to save templates to localStorage", err);
    }
  }, [templates]);

  // Clear the highlight after ~1s
  useEffect(() => {
    if (!recentlyAddedId) return;
    const timeout = setTimeout(() => {
      setRecentlyAddedId(null);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [recentlyAddedId]);

  function handleAddTemplate(e: React.FormEvent) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      alert("Title and body are required.");
      return;
    }

    const newTemplate: Template = {
      id: Date.now().toString() + Math.random().toString(16),
      title: trimmedTitle,
      body: trimmedBody,
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    setTitle("");
    setBody("");
    setRecentlyAddedId(newTemplate.id);
  }

  function handleDeleteTemplate(id: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setEditingTitle("");
      setEditingBody("");
    }
  }

  async function handleCopy(text: string) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        alert("Template body copied to clipboard!");
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("Template body copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to copy text", err);
      alert("Could not copy to clipboard.");
    }
  }

  // Start editing a template
  function handleStartEdit(template: Template) {
    setEditingId(template.id);
    setEditingTitle(template.title);
    setEditingBody(template.body);
  }

  // Save edits
  function handleSaveEdit(id: string) {
    const trimmedTitle = editingTitle.trim();
    const trimmedBody = editingBody.trim();

    if (!trimmedTitle || !trimmedBody) {
      alert("Title and body are required.");
      return;
    }

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, title: trimmedTitle, body: trimmedBody } : t
      )
    );

    setEditingId(null);
    setEditingTitle("");
    setEditingBody("");
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingId(null);
    setEditingTitle("");
    setEditingBody("");
  }

  const normalizedSearch = search.toLowerCase();
  const filteredTemplates = templates.filter((t) =>
    t.title.toLowerCase().includes(normalizedSearch)
  );

  const mainBg = darkMode ? "#020617" : "#e5e7eb";
  const mainText = darkMode ? "#e5e7eb" : "#111827";

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "1rem 2rem",
        width: "100vw",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        backgroundColor: mainBg,
        color: mainText,
      }}
    >
      {/* HEADER + TOGGLES */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: "bold",
            margin: 0,
            color: mainText,
          }}
        >
          Clipboard Templates
        </h1>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          {/* Dark mode toggle */}
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #4b5563",
              backgroundColor: darkMode ? "#111827" : "#f9fafb",
              color: darkMode ? "#e5e7eb" : "#111827",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {darkMode ? "Light mode" : "Dark mode"}
          </button>

          {/* Creator toggle */}
          <button
            type="button"
            onClick={() => setShowCreator((prev) => !prev)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: "999px",
              border: "1px solid #d1d5db",
              backgroundColor: showCreator
                ? darkMode
                  ? "#0f172a"
                  : "#f9fafb"
                : darkMode
                ? "#e5e7eb"
                : "#111827",
              color: showCreator
                ? darkMode
                  ? "#e5e7eb"
                  : "#111827"
                : darkMode
                ? "#020617"
                : "#f9fafb",
              fontSize: "0.9rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {showCreator ? "Hide Creator" : "Show Creator"}
          </button>
        </div>
      </div>

      {/* TEMPLATE CREATOR (can be hidden) */}
      {showCreator && (
        <TemplateCreator
          title={title}
          body={body}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onSubmit={handleAddTemplate}
          darkMode={darkMode}
        />
      )}

      {/* SEARCH BAR */}
      <SearchBar
        search={search}
        onSearchChange={setSearch}
        darkMode={darkMode}
      />

      {/* CLIPBOARD GRID */}
      <section
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: "0.25rem",
          width: "100%",
        }}
      >
        <TemplatesGrid
          templates={filteredTemplates}
          onCopy={handleCopy}
          onDelete={handleDeleteTemplate}
          editingId={editingId}
          editingTitle={editingTitle}
          editingBody={editingBody}
          onStartEdit={handleStartEdit}
          onChangeEditingTitle={setEditingTitle}
          onChangeEditingBody={setEditingBody}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={handleCancelEdit}
          recentlyAddedId={recentlyAddedId}
          darkMode={darkMode}
        />
      </section>
    </main>
  );
}
