"use client";
import { useState } from "react";
import type { Advisory, Day, Rule } from "@/lib/db";
import type { RuleResult } from "@/lib/engine/types";
import type { RuleTypeInfo } from "@/lib/engine/registry";
import { formatEvidence } from "@/lib/format";
import { adminFetch } from "../../apiClient";
import RuleEditor, { type DraftPayload, type DraftRule } from "./RuleEditor";
import { renderMarkdown } from "./md";

const byPosition = (a: Rule, b: Rule) => a.position - b.position || a.id - b.id;

const ghostButton: React.CSSProperties = {
  border: "1px solid var(--color-line-strong)",
  background: "#fff",
  borderRadius: 8,
  padding: "5px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
};

const RULE_LIST: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

interface DryResult {
  engineVersion: string;
  folderPath: string;
  truncated: boolean;
  skipped: string[];
  status: "PASS" | "PASS_WITH_FIXES" | "REDO";
  results: RuleResult[];
  advisory: Advisory | null;
}

interface DryRulePayload {
  id?: number;
  type: string;
  file_pattern: string;
  params: Record<string, unknown>;
  message: string;
  severity: "required" | "advisory";
  enabled: boolean;
}

export default function DayEditor({
  initialDay,
  initialRules,
  ruleTypes,
}: {
  initialDay: Day;
  initialRules: Rule[];
  ruleTypes: RuleTypeInfo[];
}) {
  const labelOf = (type: string) =>
    ruleTypes.find((t) => t.id === type)?.label ?? type;
  const [day, setDay] = useState(initialDay);
  const [rules, setRules] = useState<Rule[]>(() => [...initialRules].sort(byPosition));
  const [dayBusy, setDayBusy] = useState(false);
  const [dayMessage, setDayMessage] = useState<string | null>(null);
  const [dayError, setDayError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [draft, setDraft] = useState<DraftRule | null>(null);
  const [liveDraft, setLiveDraft] = useState<{ id?: number; payload: DraftPayload } | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleNotice, setRuleNotice] = useState<string | null>(null);
  const [dryRepo, setDryRepo] = useState("");
  const [dryGemini, setDryGemini] = useState(false);
  const [dryBusy, setDryBusy] = useState(false);
  const [dryError, setDryError] = useState<string | null>(null);
  const [dryResult, setDryResult] = useState<DryResult | null>(null);

  async function saveDay(e: React.FormEvent) {
    e.preventDefault();
    setDayError(null);
    setDayMessage(null);
    setDayBusy(true);
    try {
      const res = await adminFetch<{ day: Day }>(`/api/admin/days/${day.day_number}`, "PATCH", {
        title: day.title,
        requirements_md: day.requirements_md,
        published: day.published,
      });
      setDay(res.day);
      setDayMessage("Day saved.");
    } catch (err) {
      setDayError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setDayBusy(false);
    }
  }

  async function toggleUseStrict(checked: boolean) {
    setDayError(null);
    setDayMessage(null);
    try {
      const res = await adminFetch<{ day: Day; rules: Rule[] }>(
        `/api/admin/days/${day.day_number}/use-strict`,
        "POST",
        { enabled: checked },
      );
      setDay(res.day);
      setRules([...res.rules].sort(byPosition));
      setDayMessage(checked ? "Use strict rule added." : "Use strict rule removed.");
    } catch (err) {
      setDayError(err instanceof Error ? err.message : "Toggle failed.");
    }
  }

  async function importCurriculum() {
    setImportBusy(true);
    setImportMessage(null);
    try {
      const res = await adminFetch<{ section: string; filenames: string[] }>(
        `/api/admin/curriculum?day=${day.day_number}`,
        "GET",
      );
      setDay((prev) => ({ ...prev, requirements_md: res.section }));
      setSuggested(res.filenames);
      setPicked([]);
      setImportMessage(
        `Requirements filled from curriculum.md for day ${day.day_number}. Nothing is saved yet. Tick files to add them as rules.`,
      );
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  async function addPickedRules() {
    if (picked.length === 0) return;
    setImportBusy(true);
    setImportMessage(null);
    try {
      let added = 0;
      for (const filename of picked) {
        const res = await adminFetch<{ rule: Rule }>(
          `/api/admin/days/${day.day_number}/rules`,
          "POST",
          {
            type: "file_exists",
            file_pattern: "**/*",
            params: { path: filename },
            message: `The submission must include ${filename}.`,
            severity: "required",
            enabled: true,
          },
        );
        setRules((prev) => [...prev, res.rule].sort(byPosition));
        added++;
      }
      setPicked([]);
      setSuggested((prev) => prev.filter((f) => !picked.includes(f)));
      setImportMessage(`Added ${added} rule(s).`);
    } catch (err) {
      setImportMessage(err instanceof Error ? err.message : "Adding rules failed.");
    } finally {
      setImportBusy(false);
    }
  }

  async function moveRule(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= rules.length) return;
    const next = [...rules];
    [next[index], next[j]] = [next[j], next[index]];
    try {
      await adminFetch(`/api/admin/days/${day.day_number}/rules/reorder`, "POST", {
        order: next.map((r) => r.id),
      });
      setRules(next);
      setRuleError(null);
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "Reorder failed.");
    }
  }

  async function toggleRule(rule: Rule) {
    try {
      const res = await adminFetch<{ rule: Rule }>(`/api/admin/rules/${rule.id}`, "PATCH", {
        enabled: !rule.enabled,
      });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? res.rule : r)).sort(byPosition));
      setRuleError(null);
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function removeRule(rule: Rule) {
    if (!window.confirm(`Delete the rule "${rule.message}"?`)) return;
    try {
      await adminFetch(`/api/admin/rules/${rule.id}`, "DELETE");
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      setRuleError(null);
      setRuleNotice("Rule deleted.");
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  function savedRule(rule: Rule, isNew: boolean) {
    setRules((prev) => {
      const next = isNew ? [...prev, rule] : prev.map((r) => (r.id === rule.id ? rule : r));
      return next.sort(byPosition);
    });
    setDraft(null);
    setLiveDraft(null);
    setRuleNotice(isNew ? "Rule added." : "Rule saved.");
    setRuleError(null);
  }

  function startEdit(rule: Rule) {
    setRuleNotice(null);
    setRuleError(null);
    setDraft({ ...rule });
  }

  function startNew() {
    setRuleNotice(null);
    setRuleError(null);
    setDraft({
      day_number: day.day_number,
      position: 0,
      type: "file_exists",
      file_pattern: "**/*",
      params: {},
      message: "",
      severity: "required",
      enabled: true,
      system_managed: false,
    });
  }

  async function runDry() {
    setDryError(null);
    setDryResult(null);
    setDryBusy(true);
    try {
      const payloads: DryRulePayload[] = rules
        .filter((r) => !(liveDraft?.id !== undefined && r.id === liveDraft.id))
        .map((r) => ({
          id: r.id,
          type: r.type,
          file_pattern: r.file_pattern,
          params: r.params,
          message: r.message,
          severity: r.severity,
          enabled: r.enabled,
        }));
      if (liveDraft && liveDraft.payload.message.trim()) {
        payloads.push({ ...liveDraft.payload, id: liveDraft.id });
      }
      const res = await adminFetch<DryResult>("/api/admin/dryrun", "POST", {
        repo: dryRepo,
        day: {
          day_number: day.day_number,
          title: day.title,
          requirements_md: day.requirements_md,
        },
        rules: payloads,
        useGemini: dryGemini,
      });
      setDryResult(res);
    } catch (err) {
      setDryError(err instanceof Error ? err.message : "Dry run failed.");
    } finally {
      setDryBusy(false);
    }
  }

  return (
    <>
      <h1 className="page-title">
        Day {day.day_number}: {day.title || "(no title)"}
      </h1>
      <p className="page-sub">
        {day.published ? "Published" : "Draft"} · updated{" "}
        {new Date(day.updated_at).toLocaleString()}
      </p>

      <section className="panel">
        <h2>Day settings</h2>
        <form onSubmit={saveDay}>
          <label htmlFor="day-title">Title</label>
          <input
            id="day-title"
            value={day.title}
            onChange={(e) => setDay({ ...day, title: e.target.value })}
          />
          <div style={{ height: 12 }} />

          <label htmlFor="day-requirements">Requirements (markdown)</label>
          <textarea
            id="day-requirements"
            rows={12}
            style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13 }}
            value={day.requirements_md}
            onChange={(e) => setDay({ ...day, requirements_md: e.target.value })}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <button type="button" style={ghostButton} onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "Preview"}
            </button>
            <button type="button" style={ghostButton} onClick={importCurriculum} disabled={importBusy}>
              {importBusy ? "Working..." : "Import requirements from curriculum.md"}
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
              <input
                type="checkbox"
                style={{ width: "auto" }}
                checked={day.published}
                onChange={(e) => setDay({ ...day, published: e.target.checked })}
              />
              Published
            </label>
          </div>
          {showPreview && (
            <div
              style={{
                marginTop: 12,
                border: "1px solid var(--color-line)",
                borderRadius: 8,
                padding: 16,
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(day.requirements_md) }}
            />
          )}
          {importMessage && (
            <p className="muted" style={{ marginTop: 10 }}>
              {importMessage}
            </p>
          )}
          {suggested.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <label style={{ marginBottom: 6 }}>Files found in the section</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {suggested.map((f) => (
                  <label
                    key={f}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={picked.includes(f)}
                      onChange={(e) =>
                        setPicked((prev) =>
                          e.target.checked ? [...prev, f] : prev.filter((x) => x !== f),
                        )
                      }
                    />
                    {f}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  style={ghostButton}
                  onClick={addPickedRules}
                  disabled={importBusy || picked.length === 0}
                >
                  Add checked as rules
                </button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
            <button className="primary" type="submit" disabled={dayBusy}>
              {dayBusy ? "Saving..." : "Save day settings"}
            </button>
            {dayMessage && <span className="muted">{dayMessage}</span>}
          </div>
          {dayError && <div className="error">{dayError}</div>}
        </form>

        <div style={{ borderTop: "1px solid var(--color-line)", marginTop: 18, paddingTop: 14 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={day.require_use_strict}
              onChange={(e) => toggleUseStrict(e.target.checked)}
            />
            Require &quot;use strict&quot; in every JavaScript file
          </label>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Creates one system managed directive rule. Edit it from this toggle, not by hand.
          </p>
        </div>
      </section>

      <section className="panel">
        <div style={{ display: "flex", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Rules</h2>
          <button
            type="button"
            className="primary"
            style={{ marginLeft: "auto" }}
            onClick={startNew}
          >
            Add rule
          </button>
        </div>
        <p className="sub">
          Ordered as the checklist shows them. Required failures give REDO, advisory failures give
          PASS WITH FIXES.
        </p>

        {draft && (
          <RuleEditor
            key={draft.id === undefined ? "new" : `edit-${draft.id}`}
            dayNumber={day.day_number}
            ruleTypes={ruleTypes}
            initial={draft}
            onSaved={savedRule}
            onCancel={() => {
              setDraft(null);
              setLiveDraft(null);
            }}
            onLiveChange={setLiveDraft}
          />
        )}

        {rules.length === 0 ? (
          <p className="muted">No rules yet. Add the first one.</p>
        ) : (
          <ul style={RULE_LIST}>
            {rules.map((r, i) => (
              <li
                key={r.id}
                style={{ borderBottom: "1px solid var(--color-line)", paddingBottom: 10 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    style={ghostButton}
                    onClick={() => moveRule(i, -1)}
                    disabled={i === 0}
                    title="Move up"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    style={ghostButton}
                    onClick={() => moveRule(i, 1)}
                    disabled={i === rules.length - 1}
                    title="Move down"
                  >
                    Down
                  </button>
                  <span style={{ fontWeight: 500 }}>{labelOf(r.type)}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {r.type} · {r.severity} · {r.file_pattern}
                  </span>
                  {r.system_managed && (
                    <span className="badge PASS_WITH_FIXES">system</span>
                  )}
                  {!r.enabled && <span className="badge REDO">disabled</span>}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <button type="button" style={ghostButton} onClick={() => toggleRule(r)}>
                      {r.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      style={ghostButton}
                      onClick={() => startEdit(r)}
                      disabled={r.system_managed}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      style={ghostButton}
                      onClick={() => removeRule(r)}
                      disabled={r.system_managed}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {r.message}
                </div>
              </li>
            ))}
          </ul>
        )}
        {ruleError && <div className="error">{ruleError}</div>}
        {ruleNotice && <p className="muted">{ruleNotice}</p>}
      </section>

      <section className="panel">
        <h2>Dry run</h2>
        <p className="sub">
          Run the rules above against a real public repo, including unpublished days and the rule
          currently being edited. Nothing is saved to reviews.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 380px" }}>
            <label htmlFor="dry-repo">Public GitHub repo URL</label>
            <input
              id="dry-repo"
              value={dryRepo}
              onChange={(e) => setDryRepo(e.target.value)}
              placeholder="https://github.com/user/repo (or .../tree/main/day1)"
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={dryGemini}
              onChange={(e) => setDryGemini(e.target.checked)}
            />
            Include Gemini notes
          </label>
          <button
            type="button"
            className="primary"
            onClick={runDry}
            disabled={dryBusy || !dryRepo.trim()}
          >
            {dryBusy ? "Running..." : "Run dry run"}
          </button>
        </div>
        {dryError && <div className="error">{dryError}</div>}

        {dryResult && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span className={`badge ${dryResult.status}`}>
                {dryResult.status.replace(/_/g, " ")}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {dryResult.folderPath} · engine {dryResult.engineVersion} ·{" "}
                {dryResult.results.filter((r) => r.passed).length}/{dryResult.results.length}{" "}
                passed
              </span>
            </div>
            {dryResult.truncated && dryResult.skipped.length > 0 && (
              <p className="muted">
                Submission truncated, {dryResult.skipped.length} file(s) skipped:{" "}
                {dryResult.skipped.join(", ")}.
              </p>
            )}
            <ul style={{ ...RULE_LIST, marginTop: 12 }}>
              {dryResult.results.map((r, i) => (
                <li key={i} style={{ borderBottom: "1px solid var(--color-line)", paddingBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: r.passed ? "var(--color-ok)" : "var(--color-redo-fg)",
                      }}
                    >
                      {r.passed ? "OK" : "FAIL"}
                    </span>
                    <span style={{ fontWeight: 500 }}>{labelOf(r.type)}</span>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {r.severity}
                    </span>
                  </div>
                  {!r.passed && (
                    <div style={{ paddingLeft: 30 }}>
                      <div className="muted">{r.message}</div>
                      {r.evidence.map((e, j) => (
                        <div
                          key={j}
                          className="muted"
                          style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                        >
                          {formatEvidence(e)}
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {dryResult.advisory && (
              <div style={{ marginTop: 12 }}>
                <strong>Comments and naming notes (advisory)</strong>
                {dryResult.advisory.status === "ok" ? (
                  (dryResult.advisory.findings ?? []).length === 0 ? (
                    <p className="muted">No notes.</p>
                  ) : (
                    <ul style={{ ...RULE_LIST, marginTop: 6 }}>
                      {(dryResult.advisory.findings ?? []).map((f, i) => (
                        <li key={i} className="muted">
                          {f.category} · {f.severity} · {f.file}, line {f.line}: {f.problem}
                        </li>
                      ))}
                    </ul>
                  )
                ) : (
                  <p className="muted">
                    Notes {dryResult.advisory.status === "skipped" ? "skipped" : "unavailable"}:{" "}
                    {dryResult.advisory.reason ?? "unknown reason"}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
