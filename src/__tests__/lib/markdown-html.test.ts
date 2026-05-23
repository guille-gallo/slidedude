import { describe, expect, it } from "vitest";
import { renderContentMarkdownHtml } from "@/lib/markdown-html";

describe("renderContentMarkdownHtml", () => {
  it("renders GitHub-flavored tables", () => {
    const html = renderContentMarkdownHtml(`| Feature | Status |
| --- | --- |
| Tables | Works |
| Lists | Works |`);

    expect(html).toContain("<table>");
    expect(html).toContain("<th>Feature</th>");
    expect(html).toContain("<td>Tables</td>");
    expect(html).toContain("<td>Works</td>");
  });

  it("escapes raw HTML while preserving markdown formatting", () => {
    const html = renderContentMarkdownHtml("**Bold** <script>alert(1)</script> and `code`");

    expect(html).toContain("<strong>Bold</strong>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("<code>code</code>");
    expect(html).not.toContain("<script>");
  });

  it("drops unsafe link protocols", () => {
    const html = renderContentMarkdownHtml("[bad](javascript:alert(1)) [good](https://example.com)");

    expect(html).toContain("bad");
    expect(html).not.toContain("javascript:alert");
    expect(html).toContain("href=\"https://example.com\"");
  });

  it("renders single newlines inside paragraphs as line breaks", () => {
    const html = renderContentMarkdownHtml("Line one\nLine two");

    expect(html).toBe("<p>Line one<br>Line two</p>");
  });
});