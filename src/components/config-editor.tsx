"use client";

import { useMemo, useState, useTransition } from "react";
import YAML from "yaml";
import type { UiMessages } from "@/lib/ui/i18n";

export function ConfigEditor({ initialRaw, messages }: { initialRaw: string; messages: UiMessages }) {
  const [value, setValue] = useState(initialRaw);
  const [savedValue, setSavedValue] = useState(initialRaw);
  const [message, setMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const t = messages.pages.config;
  const common = messages.common;

  const dirty = value !== savedValue;
  const validation = useMemo(() => {
    try {
      const parsed = YAML.parse(value);
      if (!parsed || typeof parsed !== "object") {
        return { valid: false, message: t.configMustBeObject };
      }
      return { valid: true, message: common.yamlValid };
    } catch (error) {
      return { valid: false, message: error instanceof Error ? error.message : common.yamlInvalid };
    }
  }, [value, common.yamlInvalid, common.yamlValid, t.configMustBeObject]);

  async function onSave() {
    setMessage(null);
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: value }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Failed to save config.");
        return;
      }
      setSavedValue(data.raw);
      setValue(data.raw);
      setLastSavedAt(new Date().toLocaleString());
      setMessage(t.savedToDisk);
    });
  }

  function onRevert() {
    setValue(savedValue);
    setMessage(t.reverted);
  }

  return (
    <div className="stack-lg">
      <div className="card card-pad stack-md">
        <div className="row-between">
          <div>
            <h3 className="section-title">{t.rawEditor}</h3>
            <p className="section-copy">{t.editorDescription}</p>
          </div>
          <div className="toolbar-group">
            <span className={validation.valid ? "pill good" : "pill warn"}>{validation.message}</span>
            <span className={dirty ? "pill warn" : "pill"}>{dirty ? common.unsavedChanges : common.saved}</span>
            <button className="button-secondary" disabled={!dirty || isPending} onClick={onRevert} type="button">{common.revert}</button>
            <button className="button-primary" disabled={isPending || !validation.valid} onClick={onSave} type="button">
              {isPending ? common.saving : common.saveConfig}
            </button>
          </div>
        </div>
        <div className="row-between compact-top-row">
          <div className="inline-note">{t.liveFile}</div>
          <div className="inline-note">{lastSavedAt ? `Last saved ${lastSavedAt}` : t.saveHint}</div>
        </div>
        <textarea className="code-editor" value={value} onChange={(e) => setValue(e.target.value)} spellCheck={false} />
        {message ? <div className="inline-note">{message}</div> : null}
      </div>
    </div>
  );
}
