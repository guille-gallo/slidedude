"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { slideMarkdownComponents } from "@/lib/slide-markdown-components";

interface SlideMarkdownProps {
  source: string;
  className?: string;
}

/**
 * Tailwind-styled GitHub-Flavored Markdown renderer used for ContentSlide bodies.
 * Supports tables, lists, inline code, blockquotes, links, etc.
 * Raw HTML in the source is escaped (no rehype-raw) for safety.
 */
export function SlideMarkdown({ source, className }: SlideMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={slideMarkdownComponents}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
