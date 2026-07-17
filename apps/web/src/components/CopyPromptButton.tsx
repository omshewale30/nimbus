"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  /** Called after a successful copy — used to record the usage event. */
  onCopied?: () => void;
}

/** The prompt library's main affordance: copy to clipboard with feedback. */
export function CopyPromptButton({ text, onCopied }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return; // clipboard unavailable (permissions, insecure context)
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
    onCopied?.();
  }

  return (
    <button className={copied ? "btn btn-copied" : "btn"} type="button" onClick={copy}>
      {copied ? "Copied ✓" : "Copy prompt"}
    </button>
  );
}
