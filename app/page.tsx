"use client";

import { useEffect, useState } from "react";
import TemplateCreator from "./components/TemplateCreator";
import SearchBar from "./components/SearchBar";
import TemplatesGrid from "./components/TemplatesGrid";

export default function ClipboardTemplatesPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState([]);

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  // NEW: show/hide creator
  const [showCreator, setShowCreator] = useState(true);

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

  function handleAddTemplate(e) {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();

    if (!trimmedTitle || !trimmedBody) {
      alert("Title and body are required.");
      return;
    }

    const newTemplate = {
      id: Date.now().toString() + Math.random().toString(16),
      title: trimmedTitle,
      body: trimmedBody,
    };

    setTemplates((prev) => [newTemplate, ...prev]);
    setTitle("");
    setBody("");
  }

  function handleDeleteTemplate(id) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));

    if (editingId === id) {
      setEditingId(null);
      setEditingTitle("");
      setEditingBody("");
    }
  }

  async function handleCopy(text) {
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
  function handleStartEdit(template) {
    setEditingId(template.id);
    setEditingTitle(template.title);
    setEditingBody(template.body);
  }

  // Save edits
  function handleSaveEdit(id) {
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
      }}
    >
      {/* HEADER + TOGGLE */}
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
          }}
        >
          Clipboard Templates
        </h1>

        <button
          type="button"
          onClick={() => setShowCreator((prev) => !prev)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "999px",
            border: "1px solid #d1d5db",
            backgroundColor: showCreator ? "#f9fafb" : "#111827",
            color: showCreator ? "#111827" : "#f9fafb",
            fontSize: "0.9rem",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {showCreator ? "Hide Creator" : "Show Creator"}
        </button>
      </div>

      {/* TEMPLATE CREATOR (can be hidden) */}
      {showCreator && (
        <TemplateCreator
          title={title}
          body={body}
          onTitleChange={setTitle}
          onBodyChange={setBody}
          onSubmit={handleAddTemplate}
        />
      )}

      {/* SEARCH BAR */}
      <SearchBar search={search} onSearchChange={setSearch} />

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
        />
      </section>
    </main>
  );
}
