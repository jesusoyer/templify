"use client";

import React, { useState, useMemo } from "react";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type WorkflowBranch = {
  id: string;
  label: string;
  nextStepId: string | null; // null = this branch ends the workflow
};

export type WorkflowStep = {
  id: string;
  title: string;
  instruction: string;
  branches: WorkflowBranch[];
};

export type Workflow = {
  id: string;
  name: string;
  title: string;             // `${name} Workflow`
  steps: Record<string, WorkflowStep>;
  rootStepId: string;
  resumeEnabled: boolean;
  lastVisitedStepId?: string | null;
  pinned?: boolean;
  createdAt: number;
};

type WorkflowPanelProps = {
  workflows: Workflow[];
  darkMode: boolean;
  onUpdateWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (id: string) => void;
  onPinWorkflow: (id: string) => void;
  onUnpinWorkflow: (id: string) => void;
  // The create-workflow modal now lives in page.tsx (so the
  // "+ Add Workflow" button in SearchBar can trigger the same flow).
  // WorkflowPanel just needs to know which workflow's builder is open.
  builderOpenWorkflowId: string | null;
  onOpenBuilder: (id: string | null) => void;
};

// ─────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────

const BOX_W = 200;
const BOX_H = 88;
const COL_GAP = 90;
const ROW_GAP = 28;
const PADDING = 40;

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeBlankStep(): WorkflowStep {
  return { id: newId("step"), title: "", instruction: "", branches: [] };
}

// ─────────────────────────────────────────────
// Tree layout algorithm — column = depth from root, row = vertical slot
// ─────────────────────────────────────────────

type LayoutNode = {
  step: WorkflowStep;
  col: number;
  row: number;
  x: number;
  y: number;
  parentId: string | null;
  branchLabel: string | null;
};

type RejoinEdge = {
  fromStepId: string;
  toStepId: string;
  branchLabel: string;
};

function computeLayout(workflow: Workflow): { nodes: LayoutNode[]; width: number; height: number; rejoinEdges: RejoinEdge[] } {
  const visited = new Set<string>();
  const allNodes: LayoutNode[] = [];
  const rejoinEdges: RejoinEdge[] = [];
  let rowCounter = 0;

  function visit(stepId: string, col: number, parentId: string | null, branchLabel: string | null) {
    if (visited.has(stepId)) return;
    const step = workflow.steps[stepId];
    if (!step) return;
    visited.add(stepId);

    const node: LayoutNode = { step, col, row: 0, x: 0, y: 0, parentId, branchLabel };
    allNodes.push(node);

    if (step.branches.length === 0) {
      node.row = rowCounter;
      rowCounter += 1;
    } else {
      const startRow = rowCounter;
      step.branches.forEach((b) => {
        if (!b.nextStepId) return;
        if (visited.has(b.nextStepId)) {
          // Points back to a step already drawn elsewhere in the tree —
          // record as a rejoin edge instead of trying to draw a new box.
          rejoinEdges.push({ fromStepId: stepId, toStepId: b.nextStepId, branchLabel: b.label || "(unlabeled)" });
          return;
        }
        visit(b.nextStepId, col + 1, stepId, b.label || "(unlabeled)");
      });
      if (rowCounter === startRow) { node.row = rowCounter; rowCounter += 1; }
      else {
        const childRows = allNodes.filter((n) => n.parentId === stepId).map((n) => n.row);
        node.row = childRows.length ? (Math.min(...childRows) + Math.max(...childRows)) / 2 : startRow;
      }
    }
  }

  visit(workflow.rootStepId, 0, null, null);

  Object.values(workflow.steps).forEach((s) => {
    if (!visited.has(s.id)) visit(s.id, 0, null, null);
  });

  const maxCol = Math.max(0, ...allNodes.map((n) => n.col));
  let maxRow = 0;
  allNodes.forEach((n) => {
    n.x = PADDING + n.col * (BOX_W + COL_GAP);
    n.y = PADDING + n.row * (BOX_H + ROW_GAP);
    maxRow = Math.max(maxRow, n.row);
  });

  const width  = PADDING * 2 + (maxCol + 1) * BOX_W + maxCol * COL_GAP;
  const height = PADDING * 2 + (maxRow + 1) * BOX_H + maxRow * ROW_GAP + (rejoinEdges.length > 0 ? 80 : 0);

  return { nodes: allNodes, width: Math.max(width, 400), height: Math.max(height, 200), rejoinEdges };
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function WorkflowPanel({
  workflows,
  darkMode,
  onUpdateWorkflow,
  onDeleteWorkflow,
  onPinWorkflow,
  onUnpinWorkflow,
  builderOpenWorkflowId,
  onOpenBuilder,
}: WorkflowPanelProps) {
  const [runnerWorkflowId, setRunnerWorkflowId] = useState<string | null>(null);
  const [runnerCurrentStepId, setRunnerCurrentStepId] = useState<string | null>(null);
  const [runnerHistory, setRunnerHistory] = useState<string[]>([]);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");

  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showTreeView, setShowTreeView] = useState(false); // tree overlay while a workflow is running

  const cardBg      = darkMode ? "#020617" : "white";
  const borderBase  = darkMode ? "#1e293b" : "#bfdbfe";
  const accent      = "#3b82f6";
  const violet      = "#7c3aed";
  const amber       = "#f59e0b";
  const green       = "#16a34a";
  const textColor   = darkMode ? "#e5e7eb" : "#111827";
  const mutedText   = darkMode ? "#9ca3af" : "#6b7280";
  const inputBg     = darkMode ? "#020617" : "white";
  const inputBorder = darkMode ? "#475569" : "#ccc";
  const lineColor   = darkMode ? "#475569" : "#94a3b8";
  const canvasBg    = darkMode ? "#0a0f1c" : "#f8fafc";

  const modalBoxStyle: React.CSSProperties = {
    backgroundColor: darkMode ? "#1f2937" : "white",
    padding: "1.5rem", borderRadius: "0.5rem",
    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.45rem 0.55rem", borderRadius: "6px",
    border: `1px solid ${inputBorder}`, backgroundColor: inputBg, color: textColor,
    fontSize: "0.85rem", boxSizing: "border-box",
  };

  const builderWorkflow = workflows.find((w) => w.id === builderOpenWorkflowId) ?? null;

  function updateStep(workflow: Workflow, stepId: string, patch: Partial<WorkflowStep>) {
    onUpdateWorkflow({ ...workflow, steps: { ...workflow.steps, [stepId]: { ...workflow.steps[stepId], ...patch } } });
  }

  function addBranch(workflow: Workflow, stepId: string) {
    const step = workflow.steps[stepId];
    const newBranch: WorkflowBranch = { id: newId("branch"), label: "", nextStepId: null };
    updateStep(workflow, stepId, { branches: [...step.branches, newBranch] });
  }

  function updateBranch(workflow: Workflow, stepId: string, branchId: string, patch: Partial<WorkflowBranch>) {
    const step = workflow.steps[stepId];
    updateStep(workflow, stepId, { branches: step.branches.map((b) => b.id === branchId ? { ...b, ...patch } : b) });
  }

  function removeBranch(workflow: Workflow, stepId: string, branchId: string) {
    const step = workflow.steps[stepId];
    updateStep(workflow, stepId, { branches: step.branches.filter((b) => b.id !== branchId) });
  }

  function addNewStepViaBranch(workflow: Workflow, stepId: string, branchId: string) {
    const newStep = makeBlankStep();
    const updatedSteps = { ...workflow.steps, [newStep.id]: newStep };
    const step = updatedSteps[stepId];
    updatedSteps[stepId] = { ...step, branches: step.branches.map((b) => b.id === branchId ? { ...b, nextStepId: newStep.id } : b) };
    onUpdateWorkflow({ ...workflow, steps: updatedSteps });
    setEditingStepId(newStep.id);
  }

  function deleteStep(workflow: Workflow, stepId: string) {
    if (stepId === workflow.rootStepId) { alert("The starting step can't be deleted. Delete the whole workflow to start over."); return; }
    const { [stepId]: _removed, ...remainingSteps } = workflow.steps;
    const cleanedSteps: Record<string, WorkflowStep> = {};
    for (const [id, step] of Object.entries(remainingSteps)) {
      cleanedSteps[id] = { ...step, branches: step.branches.map((b) => b.nextStepId === stepId ? { ...b, nextStepId: null } : b) };
    }
    onUpdateWorkflow({ ...workflow, steps: cleanedSteps });
    if (editingStepId === stepId) setEditingStepId(null);
  }

  const layout = useMemo(() => builderWorkflow ? computeLayout(builderWorkflow) : null, [builderWorkflow]);

  function startRunner(workflow: Workflow) {
    const startStepId = (workflow.resumeEnabled && workflow.lastVisitedStepId && workflow.steps[workflow.lastVisitedStepId])
      ? workflow.lastVisitedStepId : workflow.rootStepId;
    setRunnerWorkflowId(workflow.id);
    setRunnerCurrentStepId(startStepId);
    setRunnerHistory([]);
  }

  function exitRunner() { setRunnerWorkflowId(null); setRunnerCurrentStepId(null); setRunnerHistory([]); setShowTreeView(false); }

  const runnerWorkflow = workflows.find((w) => w.id === runnerWorkflowId) ?? null;
  const runnerStep = runnerWorkflow && runnerCurrentStepId ? runnerWorkflow.steps[runnerCurrentStepId] : null;

  function persistProgress(workflow: Workflow, stepId: string | null) {
    if (!workflow.resumeEnabled) return;
    onUpdateWorkflow({ ...workflow, lastVisitedStepId: stepId });
  }

  function goToBranch(branch: WorkflowBranch) {
    if (!runnerWorkflow || !runnerCurrentStepId) return;
    setRunnerHistory((prev) => [...prev, runnerCurrentStepId]);
    if (branch.nextStepId === null) { persistProgress(runnerWorkflow, null); exitRunner(); return; }
    setRunnerCurrentStepId(branch.nextStepId);
    persistProgress(runnerWorkflow, branch.nextStepId);
  }

  function goBack() {
    if (runnerHistory.length === 0) return;
    const prevStepId = runnerHistory[runnerHistory.length - 1];
    setRunnerHistory((prev) => prev.slice(0, -1));
    setRunnerCurrentStepId(prevStepId);
    if (runnerWorkflow) persistProgress(runnerWorkflow, prevStepId);
  }

  // Jump to any step from the tree view — records the jump in history so Back still works
  function jumpToStep(stepId: string) {
    if (!runnerWorkflow || !runnerCurrentStepId) return;
    if (stepId === runnerCurrentStepId) { setShowTreeView(false); return; }
    setRunnerHistory((prev) => [...prev, runnerCurrentStepId]);
    setRunnerCurrentStepId(stepId);
    persistProgress(runnerWorkflow, stepId);
    setShowTreeView(false);
  }

  const runnerTreeLayout = useMemo(
    () => (runnerWorkflow && showTreeView) ? computeLayout(runnerWorkflow) : null,
    [runnerWorkflow, showTreeView]
  );

  function requestDelete(workflow: Workflow) { setConfirmDeleteId(workflow.id); setConfirmDeleteName(workflow.title); }
  function confirmDelete() { if (confirmDeleteId) onDeleteWorkflow(confirmDeleteId); setConfirmDeleteId(null); setConfirmDeleteName(""); }

  const pinnedWorkflows   = workflows.filter((w) => w.pinned).sort((a, b) => a.createdAt - b.createdAt);
  const unpinnedWorkflows = workflows.filter((w) => !w.pinned).sort((a, b) => b.createdAt - a.createdAt);
  const orderedWorkflows  = [...pinnedWorkflows, ...unpinnedWorkflows];

  const editingStep = builderWorkflow && editingStepId ? builderWorkflow.steps[editingStepId] : null;

  return (
    <>
      {/* ════════ List view ════════ */}
      <section style={{
        width: "100%", padding: "0.75rem 1rem",
        border: `1px solid ${borderBase}`, borderTopWidth: "2px", borderTopColor: violet,
        borderRadius: "10px", backgroundColor: cardBg,
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.16)", marginBottom: "0.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: textColor, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            🧭 Workflows
          </h2>
        </div>

        {orderedWorkflows.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: mutedText, fontStyle: "italic" }}>
            No workflows yet. Use "+ Add Workflow" next to Create Board to turn a scattered process into clear, step-by-step guidance.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {orderedWorkflows.map((wf) => {
              const stepCount = Object.keys(wf.steps).length;
              const isPinned = !!wf.pinned;
              return (
                <div key={wf.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem",
                  padding: "0.55rem 0.75rem", borderRadius: "8px", flexWrap: "wrap",
                  border: `1px solid ${isPinned ? amber : borderBase}`,
                  backgroundColor: darkMode ? "#0f172a" : "#fafafa",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                    {isPinned && <span style={{ fontSize: "0.75rem", color: amber }}>📌</span>}
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.9rem", color: textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {wf.title}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: mutedText }}>
                        {stepCount} step{stepCount !== 1 ? "s" : ""}{wf.resumeEnabled ? " • resume enabled" : ""}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => startRunner(wf)}
                      style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", border: `1px solid ${accent}`, backgroundColor: darkMode ? "#0f172a" : "#eff6ff", color: darkMode ? "#93c5fd" : "#1d4ed8", fontSize: "0.75rem", fontWeight: 500, cursor: "pointer" }}>
                      ▶ Start
                    </button>
                    <button type="button" onClick={() => onOpenBuilder(wf.id)}
                      style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#9a3412" : "#d97706"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#fdba74" : "#b45309", fontSize: "0.75rem", cursor: "pointer" }}>
                      Edit
                    </button>
                    <button type="button" onClick={() => isPinned ? onUnpinWorkflow(wf.id) : onPinWorkflow(wf.id)}
                      style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", border: `1px solid ${isPinned ? amber : (darkMode ? "#4b5563" : "#d1d5db")}`, backgroundColor: darkMode ? "#020617" : "white", color: isPinned ? "#ea580c" : (darkMode ? "#e5e7eb" : "#111827"), fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                      {isPinned ? "Unpin" : "Pin"}
                    </button>
                    <button type="button" onClick={() => requestDelete(wf)} title="Delete workflow"
                      style={{ padding: "0.2rem 0.45rem", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "#b91c1c", fontWeight: "bold", fontSize: "0.95rem", cursor: "pointer" }}>
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ════════ Delete confirmation ════════ */}
      {confirmDeleteId && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80 }}
          onClick={() => setConfirmDeleteId(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBoxStyle, maxWidth: "26rem", width: "90%" }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", marginTop: 0, marginBottom: "0.75rem", color: textColor }}>Delete Workflow?</h2>
            <p style={{ marginBottom: "1.25rem", color: mutedText }}>
              Are you sure you want to delete <strong>"{confirmDeleteName}"</strong>? All its steps and branches will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setConfirmDeleteId(null)}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: `1px solid ${inputBorder}`, backgroundColor: darkMode ? "#374151" : "#f9fafb", color: textColor, cursor: "pointer", fontWeight: 500 }}>Cancel</button>
              <button type="button" onClick={confirmDelete}
                style={{ padding: "0.5rem 1rem", borderRadius: "0.375rem", border: "none", backgroundColor: "#dc2626", color: "white", cursor: "pointer", fontWeight: 500 }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Builder modal — flowchart view ════════ */}
      {builderWorkflow && layout && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: "1rem" }}
          onClick={() => { onOpenBuilder(null); setEditingStepId(null); }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...modalBoxStyle, width: "95%", maxWidth: "70rem", height: "85vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: `1px solid ${borderBase}`, flexWrap: "wrap", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.15rem", fontWeight: "bold", margin: 0, color: textColor }}>{builderWorkflow.title}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: textColor, cursor: "pointer", userSelect: "none" }}>
                  <input type="checkbox" checked={builderWorkflow.resumeEnabled}
                    onChange={(e) => onUpdateWorkflow({ ...builderWorkflow, resumeEnabled: e.target.checked, lastVisitedStepId: e.target.checked ? builderWorkflow.lastVisitedStepId : null })}
                    style={{ width: "13px", height: "13px", accentColor: violet, cursor: "pointer" }} />
                  Resume where I left off
                </label>
                <button type="button" onClick={() => { onOpenBuilder(null); setEditingStepId(null); }}
                  style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Flowchart canvas */}
            <div
              onClick={(e) => { e.stopPropagation(); setEditingStepId(null); }}
              style={{ flex: 1, overflow: "auto", backgroundColor: canvasBg, position: "relative" }}
            >
              <svg width={layout.width} height={layout.height} style={{ display: "block" }}>
                {layout.nodes.map((node) => {
                  if (!node.parentId) return null;
                  const parent = layout.nodes.find((n) => n.step.id === node.parentId);
                  if (!parent) return null;
                  const x1 = parent.x + BOX_W;
                  const y1 = parent.y + BOX_H / 2;
                  const x2 = node.x;
                  const y2 = node.y + BOX_H / 2;
                  const midX = x1 + (x2 - x1) / 2;
                  return (
                    <g key={`edge-${node.step.id}`}>
                      <path d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`} fill="none" stroke={lineColor} strokeWidth={1.5} />
                      <polygon points={`${x2-7},${y2-4} ${x2},${y2} ${x2-7},${y2+4}`} fill={lineColor} />
                      {node.branchLabel && (
                        <g>
                          <rect x={midX - 45} y={(y1+y2)/2 - 10} width={90} height={18} rx={9} fill={canvasBg} stroke={lineColor} strokeWidth={1} />
                          <text x={midX} y={(y1+y2)/2 + 3} textAnchor="middle" fontSize="10" fill={mutedText} fontFamily="system-ui, sans-serif">
                            {node.branchLabel.length > 16 ? node.branchLabel.slice(0, 15) + "…" : node.branchLabel}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Rejoin edges — branches that loop back to an already-drawn step */}
                {layout.rejoinEdges.map((edge, idx) => {
                  const fromNode = layout.nodes.find((n) => n.step.id === edge.fromStepId);
                  const toNode   = layout.nodes.find((n) => n.step.id === edge.toStepId);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + BOX_W;
                  const y1 = fromNode.y + BOX_H / 2;
                  // Route into the target's left or top edge depending on relative position
                  const targetIsAhead = toNode.x >= fromNode.x;
                  const x2 = targetIsAhead ? toNode.x : toNode.x + BOX_W / 2;
                  const y2 = targetIsAhead ? toNode.y + BOX_H / 2 : toNode.y;
                  // Arc below everything to avoid crossing through other boxes
                  const arcY = Math.max(fromNode.y, toNode.y) + BOX_H + 36 + (idx % 3) * 14;

                  return (
                    <g key={`rejoin-${edge.fromStepId}-${edge.toStepId}-${idx}`}>
                      <path
                        d={`M ${x1} ${y1} C ${x1 + 30} ${arcY}, ${x2 - 30} ${arcY}, ${x2} ${y2}`}
                        fill="none" stroke={amber} strokeWidth={1.5} strokeDasharray="5,4"
                      />
                      <polygon points={`${x2-7},${y2-4} ${x2},${y2} ${x2-7},${y2+4}`} fill={amber} transform={targetIsAhead ? "" : `rotate(90 ${x2} ${y2})`} />
                      <g>
                        <rect x={(x1+x2)/2 - 50} y={arcY - 9} width={100} height={18} rx={9} fill={canvasBg} stroke={amber} strokeWidth={1} />
                        <text x={(x1+x2)/2} y={arcY + 4} textAnchor="middle" fontSize="9.5" fill={amber} fontFamily="system-ui, sans-serif" fontWeight={600}>
                          ↩ {edge.branchLabel.length > 12 ? edge.branchLabel.slice(0, 11) + "…" : edge.branchLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {layout.nodes.map((node) => {
                  const isRoot = node.step.id === builderWorkflow.rootStepId;
                  const isEnd = node.step.branches.length === 0;
                  const boxColor = isRoot ? accent : isEnd ? green : violet;
                  return (
                    <foreignObject key={node.step.id} x={node.x} y={node.y} width={BOX_W} height={BOX_H}>
                      <div
                        onClick={(e) => { e.stopPropagation(); setEditingStepId(node.step.id); }}
                        style={{
                          width: "100%", height: "100%", borderRadius: "8px",
                          border: `2px solid ${editingStepId === node.step.id ? amber : boxColor}`,
                          backgroundColor: darkMode ? "#0f172a" : "white",
                          padding: "0.5rem 0.6rem", cursor: "pointer",
                          display: "flex", flexDirection: "column", justifyContent: "space-between",
                          boxShadow: editingStepId === node.step.id ? `0 0 0 2px ${amber}55` : "0 2px 6px rgba(0,0,0,0.08)",
                          boxSizing: "border-box", fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: boxColor, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                            {isRoot ? "Start" : isEnd ? "End point" : "Step"}
                          </span>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: textColor, marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                            {node.step.title || "(untitled step)"}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: mutedText }}>
                          {node.step.branches.length > 0 ? `${node.step.branches.length} option${node.step.branches.length !== 1 ? "s" : ""}` : "Click to edit"}
                        </div>
                      </div>
                    </foreignObject>
                  );
                })}
              </svg>
            </div>

            {/* Inline step editor */}
            {editingStep && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ borderTop: `1px solid ${borderBase}`, padding: "1rem 1.25rem", maxHeight: "40%", overflowY: "auto", backgroundColor: darkMode ? "#111827" : "#f9fafb" }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: mutedText, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Editing: {editingStep.id === builderWorkflow.rootStepId ? "Start step" : "Step"}
                  </span>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {editingStep.id !== builderWorkflow.rootStepId && (
                      <button type="button" onClick={() => deleteStep(builderWorkflow, editingStep.id)}
                        style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: "transparent", color: "#dc2626", fontSize: "0.72rem", cursor: "pointer" }}>
                        Delete step
                      </button>
                    )}
                    <button type="button" onClick={() => setEditingStepId(null)}
                      style={{ padding: "0.2rem 0.6rem", borderRadius: "999px", border: `1px solid ${inputBorder}`, backgroundColor: "transparent", color: mutedText, fontSize: "0.72rem", cursor: "pointer" }}>
                      Done
                    </button>
                  </div>
                </div>

                <input type="text" placeholder="Step title (e.g. Verify customer ID)" value={editingStep.title}
                  onChange={(e) => updateStep(builderWorkflow, editingStep.id, { title: e.target.value })}
                  style={{ ...inputStyle, fontWeight: 600, marginBottom: "0.4rem" }} autoFocus />

                <textarea placeholder="Instructions for this step..." value={editingStep.instruction} rows={2}
                  onChange={(e) => updateStep(builderWorkflow, editingStep.id, { instruction: e.target.value })}
                  style={{ ...inputStyle, resize: "vertical", marginBottom: "0.6rem" }} />

                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: mutedText, marginBottom: "0.35rem" }}>
                  Options from this step:
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {editingStep.branches.map((branch) => (
                    <div key={branch.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <input type="text" placeholder="Option label (e.g. Yes)" value={branch.label}
                        onChange={(e) => updateBranch(builderWorkflow, editingStep.id, branch.id, { label: e.target.value })}
                        style={{ ...inputStyle, flex: "1 1 130px", fontSize: "0.8rem" }} />

                      <select value={branch.nextStepId ?? "__end__"}
                        onChange={(e) => updateBranch(builderWorkflow, editingStep.id, branch.id, { nextStepId: e.target.value === "__end__" ? null : e.target.value })}
                        title="Pick an existing step to reconnect this option back into the workflow"
                        style={{ ...inputStyle, flex: "1 1 150px", fontSize: "0.8rem" }}>
                        <option value="__end__">— Ends workflow —</option>
                        <optgroup label="↩ Reconnect to existing step">
                          {Object.values(builderWorkflow.steps).filter((s) => s.id !== editingStep.id).map((s) => (
                            <option key={s.id} value={s.id}>{s.title || "(untitled step)"}</option>
                          ))}
                        </optgroup>
                      </select>

                      <button type="button" onClick={() => addNewStepViaBranch(builderWorkflow, editingStep.id, branch.id)}
                        title="Create a new step for this option"
                        style={{ padding: "0.25rem 0.5rem", borderRadius: "999px", border: `1px solid ${violet}`, backgroundColor: darkMode ? "#1e1033" : "#f5f3ff", color: darkMode ? "#c4b5fd" : "#6d28d9", fontSize: "0.7rem", cursor: "pointer", whiteSpace: "nowrap" }}>
                        + New step
                      </button>

                      <button type="button" onClick={() => removeBranch(builderWorkflow, editingStep.id, branch.id)}
                        style={{ padding: "0.2rem 0.4rem", borderRadius: "999px", border: "none", backgroundColor: "transparent", color: "#b91c1c", fontWeight: "bold", fontSize: "0.8rem", cursor: "pointer" }}>
                        ✕
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addBranch(builderWorkflow, editingStep.id)}
                    style={{ alignSelf: "flex-start", padding: "0.25rem 0.7rem", borderRadius: "999px", border: `1px dashed ${mutedText}`, backgroundColor: "transparent", color: mutedText, fontSize: "0.72rem", cursor: "pointer" }}>
                    + Add option
                  </button>
                </div>
              </div>
            )}

            {!editingStep && (
              <div onClick={(e) => e.stopPropagation()} style={{ borderTop: `1px solid ${borderBase}`, padding: "0.65rem 1.25rem", fontSize: "0.78rem", color: mutedText, backgroundColor: darkMode ? "#111827" : "#f9fafb" }}>
                Click any box above to edit its title, instructions, and options. Dashed amber lines (↩) show an option reconnecting back into an earlier step.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ Runner modal ════════ */}
      {runnerWorkflow && runnerStep && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: "1rem" }}>
          <div style={{ ...modalBoxStyle, maxWidth: "32rem", width: "92%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: violet, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {runnerWorkflow.title}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button type="button" onClick={() => setShowTreeView(true)}
                  title="See the full workflow tree and jump to any step"
                  style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", border: `1px solid ${accent}`, backgroundColor: darkMode ? "#0f172a" : "#eff6ff", color: darkMode ? "#93c5fd" : "#1d4ed8", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                  🗺 View workflow
                </button>
                <button type="button" onClick={exitRunner}
                  style={{ padding: "0.25rem 0.7rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.75rem", cursor: "pointer", fontWeight: 500 }}>
                  ✕ Exit workflow
                </button>
              </div>
            </div>

            <h2 style={{ fontSize: "1.3rem", fontWeight: "bold", margin: "0.5rem 0 0.5rem", color: textColor }}>
              {runnerStep.title || "(untitled step)"}
            </h2>
            <p style={{ fontSize: "0.95rem", color: textColor, lineHeight: 1.5, marginBottom: "1.25rem", whiteSpace: "pre-wrap" }}>
              {runnerStep.instruction || "No instructions added for this step yet."}
            </p>

            {runnerStep.branches.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                {runnerStep.branches.map((branch) => (
                  <button key={branch.id} type="button" onClick={() => goToBranch(branch)}
                    style={{ textAlign: "left", padding: "0.65rem 0.9rem", borderRadius: "8px", border: `1px solid ${accent}`, backgroundColor: darkMode ? "#0f172a" : "#eff6ff", color: darkMode ? "#93c5fd" : "#1d4ed8", fontSize: "0.9rem", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span>{branch.label || "(unlabeled option)"}</span>
                    <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>{branch.nextStepId ? "→" : "End"}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ padding: "0.65rem 0.9rem", borderRadius: "8px", border: `1px solid ${darkMode ? "#166534" : "#bbf7d0"}`, backgroundColor: darkMode ? "#052e16" : "#f0fdf4", color: darkMode ? "#4ade80" : "#15803d", fontSize: "0.85rem", marginBottom: "1rem" }}>
                ✓ This is the end of this path.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <button type="button" onClick={goBack} disabled={runnerHistory.length === 0}
                style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: `1px solid ${runnerHistory.length === 0 ? (darkMode ? "#1e293b" : "#e5e7eb") : (darkMode ? "#4b5563" : "#d1d5db")}`, backgroundColor: darkMode ? "#020617" : "white", color: runnerHistory.length === 0 ? (darkMode ? "#374151" : "#d1d5db") : textColor, fontSize: "0.82rem", cursor: runnerHistory.length === 0 ? "default" : "pointer", fontWeight: 500 }}>
                ← Back
              </button>

              {runnerStep.branches.length === 0 && (
                <button type="button" onClick={() => { persistProgress(runnerWorkflow, null); exitRunner(); }}
                  style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: "none", backgroundColor: green, color: "white", fontSize: "0.82rem", cursor: "pointer", fontWeight: 500 }}>
                  Finish ✓
                </button>
              )}

              <button type="button" onClick={() => onOpenBuilder(runnerWorkflow.id)}
                title="Edit this workflow's steps without losing your place"
                style={{ padding: "0.4rem 0.9rem", borderRadius: "999px", border: `1px solid ${darkMode ? "#9a3412" : "#d97706"}`, backgroundColor: darkMode ? "#020617" : "white", color: darkMode ? "#fdba74" : "#b45309", fontSize: "0.82rem", cursor: "pointer", fontWeight: 500 }}>
                ✎ Edit workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════ Tree view overlay (running workflow) — click any step to jump there ════════ */}
      {runnerWorkflow && runnerTreeLayout && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 95, padding: "1rem" }}
          onClick={(e) => { e.stopPropagation(); setShowTreeView(false); }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ ...modalBoxStyle, width: "95%", maxWidth: "70rem", height: "80vh", display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: `1px solid ${borderBase}`, flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0, color: textColor }}>{runnerWorkflow.title}</h2>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: mutedText }}>Click any step to jump straight to it.</p>
              </div>
              <button type="button" onClick={() => setShowTreeView(false)}
                style={{ padding: "0.3rem 0.8rem", borderRadius: "999px", border: "1px solid #fca5a5", backgroundColor: darkMode ? "#1c0a0a" : "#fff5f5", color: darkMode ? "#fca5a5" : "#dc2626", fontSize: "0.8rem", cursor: "pointer", fontWeight: 500 }}>
                ✕ Close
              </button>
            </div>

            <div
              onClick={(e) => e.stopPropagation()}
              style={{ flex: 1, overflow: "auto", backgroundColor: canvasBg, position: "relative" }}
            >
              <svg width={runnerTreeLayout.width} height={runnerTreeLayout.height} style={{ display: "block" }}>
                {runnerTreeLayout.nodes.map((node) => {
                  if (!node.parentId) return null;
                  const parent = runnerTreeLayout.nodes.find((n) => n.step.id === node.parentId);
                  if (!parent) return null;
                  const x1 = parent.x + BOX_W;
                  const y1 = parent.y + BOX_H / 2;
                  const x2 = node.x;
                  const y2 = node.y + BOX_H / 2;
                  const midX = x1 + (x2 - x1) / 2;
                  return (
                    <g key={`runner-edge-${node.step.id}`}>
                      <path d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`} fill="none" stroke={lineColor} strokeWidth={1.5} />
                      <polygon points={`${x2-7},${y2-4} ${x2},${y2} ${x2-7},${y2+4}`} fill={lineColor} />
                      {node.branchLabel && (
                        <g>
                          <rect x={midX - 45} y={(y1+y2)/2 - 10} width={90} height={18} rx={9} fill={canvasBg} stroke={lineColor} strokeWidth={1} />
                          <text x={midX} y={(y1+y2)/2 + 3} textAnchor="middle" fontSize="10" fill={mutedText} fontFamily="system-ui, sans-serif">
                            {node.branchLabel.length > 16 ? node.branchLabel.slice(0, 15) + "…" : node.branchLabel}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {runnerTreeLayout.rejoinEdges.map((edge, idx) => {
                  const fromNode = runnerTreeLayout.nodes.find((n) => n.step.id === edge.fromStepId);
                  const toNode   = runnerTreeLayout.nodes.find((n) => n.step.id === edge.toStepId);
                  if (!fromNode || !toNode) return null;
                  const x1 = fromNode.x + BOX_W;
                  const y1 = fromNode.y + BOX_H / 2;
                  const targetIsAhead = toNode.x >= fromNode.x;
                  const x2 = targetIsAhead ? toNode.x : toNode.x + BOX_W / 2;
                  const y2 = targetIsAhead ? toNode.y + BOX_H / 2 : toNode.y;
                  const arcY = Math.max(fromNode.y, toNode.y) + BOX_H + 36 + (idx % 3) * 14;
                  return (
                    <g key={`runner-rejoin-${edge.fromStepId}-${edge.toStepId}-${idx}`}>
                      <path d={`M ${x1} ${y1} C ${x1 + 30} ${arcY}, ${x2 - 30} ${arcY}, ${x2} ${y2}`} fill="none" stroke={amber} strokeWidth={1.5} strokeDasharray="5,4" />
                      <polygon points={`${x2-7},${y2-4} ${x2},${y2} ${x2-7},${y2+4}`} fill={amber} transform={targetIsAhead ? "" : `rotate(90 ${x2} ${y2})`} />
                      <g>
                        <rect x={(x1+x2)/2 - 50} y={arcY - 9} width={100} height={18} rx={9} fill={canvasBg} stroke={amber} strokeWidth={1} />
                        <text x={(x1+x2)/2} y={arcY + 4} textAnchor="middle" fontSize="9.5" fill={amber} fontFamily="system-ui, sans-serif" fontWeight={600}>
                          ↩ {edge.branchLabel.length > 12 ? edge.branchLabel.slice(0, 11) + "…" : edge.branchLabel}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {runnerTreeLayout.nodes.map((node) => {
                  const isRoot = node.step.id === runnerWorkflow.rootStepId;
                  const isEnd = node.step.branches.length === 0;
                  const isCurrent = node.step.id === runnerCurrentStepId;
                  const boxColor = isRoot ? accent : isEnd ? green : violet;
                  return (
                    <foreignObject key={node.step.id} x={node.x} y={node.y} width={BOX_W} height={BOX_H}>
                      <div
                        onClick={(e) => { e.stopPropagation(); jumpToStep(node.step.id); }}
                        style={{
                          width: "100%", height: "100%", borderRadius: "8px",
                          border: `2px solid ${isCurrent ? amber : boxColor}`,
                          backgroundColor: isCurrent ? (darkMode ? "#1c1000" : "#fffbeb") : (darkMode ? "#0f172a" : "white"),
                          padding: "0.5rem 0.6rem", cursor: "pointer",
                          display: "flex", flexDirection: "column", justifyContent: "space-between",
                          boxShadow: isCurrent ? `0 0 0 2px ${amber}55` : "0 2px 6px rgba(0,0,0,0.08)",
                          boxSizing: "border-box", fontFamily: "system-ui, sans-serif",
                        }}
                      >
                        <div>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, color: isCurrent ? amber : boxColor, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                            {isCurrent ? "● You are here" : isRoot ? "Start" : isEnd ? "End point" : "Step"}
                          </span>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: textColor, marginTop: "0.15rem", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any }}>
                            {node.step.title || "(untitled step)"}
                          </div>
                        </div>
                        <div style={{ fontSize: "0.7rem", color: mutedText }}>
                          {isCurrent ? "Click elsewhere to jump" : "Click to jump here"}
                        </div>
                      </div>
                    </foreignObject>
                  );
                })}
              </svg>
            </div>

            <div onClick={(e) => e.stopPropagation()} style={{ borderTop: `1px solid ${borderBase}`, padding: "0.6rem 1.25rem", fontSize: "0.78rem", color: mutedText, backgroundColor: darkMode ? "#111827" : "#f9fafb" }}>
              Jumping to a step is added to your Back history, so ← Back still retraces your path afterward.
            </div>
          </div>
        </div>
      )}
    </>
  );
}