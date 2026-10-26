"use client";

import { useState, useTransition } from "react";

/** The visual on/off switch. */
function Toggle({ on, disabled, onClick, label }: { on: boolean; disabled?: boolean; onClick?: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${on ? "bg-brand" : "bg-line"}`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/** A switch that saves the moment it's flipped (via `onChange`, a server action). */
export function LiveSwitch({
  label,
  description,
  initial,
  onChange,
  danger,
}: {
  label: string;
  description?: string;
  initial: boolean;
  onChange: (value: boolean) => Promise<{ error?: string } | void>;
  danger?: boolean;
}) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function flip() {
    const next = !on;
    setOn(next);
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await onChange(next);
      if (result && result.error) {
        setOn(!next);
        setError(result.error);
      } else {
        setSaved(true);
      }
    });
  }

  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${danger && on ? "text-bad" : "text-ink"}`}>{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        {pending ? <span className="text-xs text-faint">Saving…</span> : saved ? <span className="text-xs text-good">Saved</span> : null}
        <Toggle on={on} disabled={pending} onClick={flip} label={label} />
      </div>
    </div>
  );
}

/** A switch inside a form: submits "on" like a checkbox. */
export function SwitchField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <label className="flex items-center gap-2 text-sm">
      <Toggle on={on} onClick={() => setOn(!on)} label={label} />
      {on && <input type="hidden" name={name} value="on" />}
      {label}
    </label>
  );
}
