import type { Slide } from "@/types";

export interface SlideSection {
  /** Section name; null for slides without a section. */
  name: string | null;
  /** Inclusive start index in the original slides array. */
  start: number;
  /** Inclusive end index in the original slides array. */
  end: number;
  /** Number of slides in this section. */
  size: number;
}

/** Group contiguous slides by their `section` field.
 *  Slides with `undefined` or empty `section` group into a `null`-named section. */
export function groupSections(slides: Slide[]): SlideSection[] {
  const sections: SlideSection[] = [];
  for (let i = 0; i < slides.length; i++) {
    const raw = slides[i].section;
    const name = raw && raw.trim() ? raw : null;
    const last = sections[sections.length - 1];
    if (last && last.name === name) {
      last.end = i;
      last.size += 1;
    } else {
      sections.push({ name, start: i, end: i, size: 1 });
    }
  }
  return sections;
}

/** Find the section containing the slide at `index`.
 *  Returns `{ section, indexInSection }` or null if out of range. */
export function findSection(
  slides: Slide[],
  index: number,
): { section: SlideSection; indexInSection: number } | null {
  if (index < 0 || index >= slides.length) return null;
  const sections = groupSections(slides);
  for (const section of sections) {
    if (index >= section.start && index <= section.end) {
      return { section, indexInSection: index - section.start };
    }
  }
  return null;
}
