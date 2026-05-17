function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return escapeHtml(trimmed);
  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return escapeHtml(trimmed);
    }
  } catch {
    if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return escapeHtml(trimmed);
  }
  return null;
}

function renderInlineMarkdown(value: string): string {
  const codePlaceholders: string[] = [];
  const withCodePlaceholders = value.replace(/`([^`]+)`/g, (_match, code: string) => {
    const placeholder = `\u0000CODE${codePlaceholders.length}\u0000`;
    codePlaceholders.push(`<code>${escapeHtml(code)}</code>`);
    return placeholder;
  });

  let html = escapeHtml(withCodePlaceholders);
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => {
    const safeUrl = sanitizeUrl(url);
    const safeLabel = renderInlineMarkdown(label);
    if (!safeUrl) return safeLabel;
    return `<a href="${safeUrl}" target="_blank" rel="noreferrer noopener">${safeLabel}</a>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

  for (let placeholderIndex = 0; placeholderIndex < codePlaceholders.length; placeholderIndex++) {
    html = html.replace(`\u0000CODE${placeholderIndex}\u0000`, codePlaceholders[placeholderIndex]);
  }

  return html;
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  if (cells.length < 2) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));
}

function splitTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells: string[] = [];
  let current = "";
  let escaped = false;

  for (const character of trimmed) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += character;
  }
  cells.push(current.trim());
  return cells;
}

function tableCellStyle(separator: string): string {
  const trimmed = separator.trim();
  if (trimmed.startsWith(":") && trimmed.endsWith(":")) return " style=\"text-align:center\"";
  if (trimmed.endsWith(":")) return " style=\"text-align:right\"";
  return "";
}

function renderTable(lines: string[]): string {
  const headers = splitTableRow(lines[0]);
  const separators = splitTableRow(lines[1]);
  const alignments = headers.map((_header, headerIndex) => tableCellStyle(separators[headerIndex] ?? ""));
  const headerHtml = headers
    .map((header, headerIndex) => `<th${alignments[headerIndex]}>${renderInlineMarkdown(header)}</th>`)
    .join("");
  const bodyHtml = lines
    .slice(2)
    .map((line) => {
      const cells = splitTableRow(line);
      return `<tr>${headers
        .map((_header, cellIndex) => `<td${alignments[cellIndex]}>${renderInlineMarkdown(cells[cellIndex] ?? "")}</td>`)
        .join("")}</tr>`;
    })
    .join("");

  return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function isBlockStart(line: string, nextLine?: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("```") ||
    /^#{1,3}\s+/.test(trimmed) ||
    /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed) ||
    /^>\s?/.test(trimmed) ||
    /^([-*+]\s+|\d+[.)]\s+)/.test(trimmed) ||
    (line.includes("|") && Boolean(nextLine && isTableSeparator(nextLine)))
  );
}

export function renderContentMarkdownHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let lineIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    if (!trimmed) {
      lineIndex++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      lineIndex++;
      while (lineIndex < lines.length && !lines[lineIndex].trim().startsWith("```")) {
        codeLines.push(lines[lineIndex]);
        lineIndex++;
      }
      if (lineIndex < lines.length) lineIndex++;
      const className = language ? ` class=\"language-${escapeHtml(language)}\"` : "";
      blocks.push(`<pre><code${className}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (line.includes("|") && lines[lineIndex + 1] && isTableSeparator(lines[lineIndex + 1])) {
      const tableLines = [line, lines[lineIndex + 1]];
      lineIndex += 2;
      while (lineIndex < lines.length && lines[lineIndex].includes("|") && lines[lineIndex].trim()) {
        tableLines.push(lines[lineIndex]);
        lineIndex++;
      }
      blocks.push(renderTable(tableLines));
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      lineIndex++;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push("<hr>");
      lineIndex++;
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (lineIndex < lines.length && /^>\s?/.test(lines[lineIndex].trim())) {
        quoteLines.push(lines[lineIndex].trim().replace(/^>\s?/, ""));
        lineIndex++;
      }
      blocks.push(`<blockquote><p>${quoteLines.map(renderInlineMarkdown).join("<br>")}</p></blockquote>`);
      continue;
    }

    const listMatch = trimmed.match(/^([-*+]\s+|\d+[.)]\s+)/);
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1]);
      const items: string[] = [];
      while (lineIndex < lines.length) {
        const currentMatch = lines[lineIndex].trim().match(/^([-*+]\s+|\d+[.)]\s+)(.+)$/);
        if (!currentMatch) break;
        items.push(`<li>${renderInlineMarkdown(currentMatch[2])}</li>`);
        lineIndex++;
      }
      blocks.push(`<${ordered ? "ol" : "ul"}>${items.join("")}</${ordered ? "ol" : "ul"}>`);
      continue;
    }

    const paragraphLines: string[] = [line];
    lineIndex++;
    while (lineIndex < lines.length && !isBlockStart(lines[lineIndex], lines[lineIndex + 1])) {
      paragraphLines.push(lines[lineIndex]);
      lineIndex++;
    }
    blocks.push(`<p>${paragraphLines.map(renderInlineMarkdown).join("<br>")}</p>`);
  }

  return blocks.join("");
}