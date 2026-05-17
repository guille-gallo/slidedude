import type { Components } from "react-markdown";

/**
 * Tailwind-styled GitHub-Flavored Markdown components used for ContentSlide bodies.
 * Shared between the client-side renderer and the server-side offline export.
 */
export const slideMarkdownComponents: Components = {
  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  h1: ({ children }) => <h2 className="mb-2 mt-3 text-2xl font-bold text-zinc-100">{children}</h2>,
  h2: ({ children }) => <h3 className="mb-2 mt-3 text-xl font-bold text-zinc-100">{children}</h3>,
  h3: ({ children }) => <h4 className="mb-2 mt-3 text-lg font-semibold text-zinc-100">{children}</h4>,
  ul: ({ children }) => <ul className="my-2 list-disc pl-6 text-left">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-6 text-left">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => {
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className="block whitespace-pre rounded-md bg-black/40 p-3 font-mono text-sm text-zinc-200">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[0.9em] text-emerald-300">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <pre className="my-2 overflow-auto">{children}</pre>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-emerald-500/40 pl-3 italic text-zinc-400">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-auto rounded-lg border border-[--border]">
      <table className="w-full border-collapse text-left text-base">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-white/[0.04]">{children}</thead>,
  th: ({ children, style }) => (
    <th style={style} className="border-b border-[--border] px-3 py-2 font-semibold text-zinc-200">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-b border-[--border]/60 px-3 py-2 text-zinc-300">
      {children}
    </td>
  ),
  hr: () => <hr className="my-3 border-[--border]" />,
  strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
};
