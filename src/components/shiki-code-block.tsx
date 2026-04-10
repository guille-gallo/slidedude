"use client";

import { useMemo } from "react";
import { useHighlighter } from "@/hooks/use-highlighter";

interface ShikiCodeBlockProps {
  code: string;
  lang: string;
  theme: string;
  className?: string;
}

export function ShikiCodeBlock({ code, lang, theme, className }: ShikiCodeBlockProps) {
  const highlighter = useHighlighter();

  const html = useMemo(() => {
    if (!highlighter) return "";
    try {
      return highlighter.codeToHtml(code, { lang, theme });
    } catch {
      return `<pre><code>${code.replace(/</g, "&lt;")}</code></pre>`;
    }
  }, [highlighter, code, lang, theme]);

  if (!highlighter) {
    return (
      <div className={`flex items-center justify-center p-8 text-zinc-500 ${className ?? ""}`}>
        Loading highlighter…
      </div>
    );
  }

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
