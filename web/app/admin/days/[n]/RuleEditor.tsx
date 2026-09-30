"use client";
import { useEffect, useState } from "react";
import type { Rule } from "@/lib/db";
import type { ParamField, RuleTypeInfo } from "@/lib/engine/registry";
import { adminFetch } from "../../apiClient";

export interface DraftPayload {
  type: string;
  file_pattern: string;
  params: Record<string, unknown>;
  message: string;
  severity: "required" | "advisory";
  enabled: boolean;
}

export interface DraftRule extends DraftPayload {
  id?: number;
  day_number: number;
  position: number;
  system_managed: boolean;
}

type FieldValue = string | boolean;

function fieldsFrom(
  ruleTypes: RuleTypeInfo[],
  type: string,
): ParamField[] {
  return ruleTypes.find((t) => t.id === type)?.fields ?? [];
}

function valuesFor(
  fields: ParamField[],
  params: Record<string, unknown>,
): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of fields) {
    const v = params[f.name];
    if (f.kind === "boolean") {
      out[f.name] =
        typeof v === "boolean"
          ? v
          : typeof f.defaultValue === "boolean"
            ? f.defaultValue
            : false;
    } else if (f.kind === "json") {
      out[f.name] =
        v !== undefined
          ? JSON.stringify(v, null, 2)
          : f.defaultValue !== undefined
            ? JSON.stringify(f.defaultValue, null, 2)
            : "";
    } else {
      out[f.name] =
        v !== undefined ? String(v) : f.defaultValue !== undefined ? String(f.defaultValue) : "";
    }
  }
  return out;
}

function buildParams(
  values: Record<string, FieldValue>,
  fields: ParamField[],
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.name];
    if (v === undefined || v === "") continue;
    if (f.kind === "boolean") {
      params[f.name] = v === true;
    } else if (f.kind === "number") {
      const n = Number(v);
      if (!Number.isFinite(n)) throw new Error(`Field ${f.label} must be a number.`);
      params[f.name] = n;
    } else if (f.kind === "json") {
      try {
        params[f.name] = JSON.parse(String(v));
      } catch {
        throw new Error(`Field ${f.label} must be valid JSON.`);
      }
    } else {
      params[f.name] = v;
    }
  }
  return params;
}

const inputStyle: React.CSSProperties = { maxWidth: 420 };

export default function RuleEditor({
  dayNumber,
  ruleTypes,
  initial,
  onSaved,
  onCancel,
  onLiveChange,
}: {
  dayNumber: number;
  ruleTypes: RuleTypeInfo[];
  initial: DraftRule;
  onSaved: (rule: Rule, isNew: boolean) => void;
  onCancel: () => void;
  onLiveChange?: (draft: { id?: number; payload: DraftPayload } | null) => void;
}) {
  const isNew = initial.id === undefined;
  const [type, setType] = useState(initial.type);
  const [filePattern, setFilePattern] = useState(initial.file_pattern);
  const [message, setMessage] = useState(initial.message);
  const [severity, setSeverity] = useState(initial.severity);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    valuesFor(fieldsFrom(ruleTypes, initial.type), initial.params),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fields = fieldsFrom(ruleTypes, type);

  useEffect(() => {
    if (!onLiveChange) return;
    try {
      onLiveChange({
        id: initial.id,
        payload: {
          type,
          file_pattern: filePattern,
          params: buildParams(values, fields),
          message,
          severity,
          enabled,
        },
      });
    } catch {
      onLiveChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filePattern, message, severity, enabled, values]);

  function changeType(next: string) {
    setType(next);
    setValues(valuesFor(fieldsFrom(ruleTypes, next), {}));
  }

  function setField(name: string, value: FieldValue) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function save() {
    setError(null);
    let params: Record<string, unknown>;
    try {
      params = buildParams(values, fields);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid params.");
      return;
    }
    setBusy(true);
    try {
      const payload: DraftPayload = {
        type,
        file_pattern: filePattern,
        params,
        message,
        severity,
        enabled,
      };
      const res = isNew
        ? await adminFetch<{ rule: Rule }>(`/api/admin/days/${dayNumber}/rules`, "POST", payload)
        : await adminFetch<{ rule: Rule }>(`/api/admin/rules/${initial.id}`, "PATCH", payload);
      onSaved(res.rule, isNew);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-line-strong)",
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        background: "#fbfbfe",
      }}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label htmlFor="rule-type">Rule type</label>
          <select
            id="rule-type"
            style={inputStyle}
            value={type}
            onChange={(e) => changeType(e.target.value)}
          >
            {ruleTypes
              .slice()
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label} ({t.id})
                </option>
              ))}
          </select>
        </div>

        <div>
          <label htmlFor="rule-pattern">File pattern (minimatch, relative to the day folder)</label>
          <input
            id="rule-pattern"
            style={inputStyle}
            value={filePattern}
            onChange={(e) => setFilePattern(e.target.value)}
            placeholder="**/*.js"
          />
        </div>

        <div>
          <label>Params</label>
          {fields.length === 0 ? (
            <p className="muted">This rule type takes no params.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {fields.map((f) => (
                <div key={f.name}>
                  <label htmlFor={`param-${f.name}`} style={{ marginBottom: 2 }}>
                    {f.label}
                    {f.required ? " *" : ""}
                  </label>
                  {f.kind === "boolean" ? (
                    <input
                      id={`param-${f.name}`}
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={values[f.name] === true}
                      onChange={(e) => setField(f.name, e.target.checked)}
                    />
                  ) : f.kind === "enum" ? (
                    <select
                      id={`param-${f.name}`}
                      style={{ ...inputStyle, maxWidth: 320 }}
                      value={String(values[f.name] ?? "")}
                      onChange={(e) => setField(f.name, e.target.value)}
                    >
                      <option value="">Choose...</option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.kind === "json" ? (
                    <textarea
                      id={`param-${f.name}`}
                      rows={3}
                      style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 13 }}
                      value={String(values[f.name] ?? "")}
                      onChange={(e) => setField(f.name, e.target.value)}
                      placeholder='JSON value, for example true'
                    />
                  ) : (
                    <input
                      id={`param-${f.name}`}
                      type={f.kind === "number" ? "number" : "text"}
                      style={{ ...inputStyle, maxWidth: 320 }}
                      value={String(values[f.name] ?? "")}
                      onChange={(e) => setField(f.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="rule-message">Failure message</label>
          <textarea
            id="rule-message"
            rows={2}
            style={{ width: "100%", fontSize: 13 }}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What is missing or wrong when this rule fails."
          />
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Describe what is missing or wrong. Do not say how to fix it.
          </p>
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <div>
            <label htmlFor="rule-severity">Severity</label>
            <select
              id="rule-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Rule["severity"])}
            >
              <option value="required">required (failure means REDO)</option>
              <option value="advisory">advisory (failure means PASS WITH FIXES)</option>
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
            <input
              type="checkbox"
              style={{ width: "auto" }}
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
            />
            Enabled
          </label>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="primary" type="button" onClick={save} disabled={busy}>
            {busy ? "Saving..." : isNew ? "Add rule" : "Save rule"}
          </button>
          <button type="button" onClick={onCancel} style={{ border: "1px solid var(--color-line-strong)", background: "#fff", borderRadius: 8, padding: "8px 14px", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}
