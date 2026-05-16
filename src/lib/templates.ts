import type { CodeSlide, ContentSlide, MermaidSlide, Presentation, Slide } from "@/types";
import { generateId } from "@/utils/id";

type CodeSlideDraft = Omit<CodeSlide, "id">;
type ContentSlideDraft = Omit<ContentSlide, "id">;
type MermaidSlideDraft = Omit<MermaidSlide, "id">;
type SlideDraft = CodeSlideDraft | ContentSlideDraft | MermaidSlideDraft;

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  slides: SlideDraft[];
}

const tutorialSlides: SlideDraft[] = [
  {
    type: "content",
    title: "Welcome to slidedude",
    body: "Build polished technical talks with code, diagrams, visual slides, sections, and presenter notes.",
    imageDataUrls: [],
    fontSize: 50,
    section: "Start",
    notes: "Open this deck in presentation mode after scanning it in the editor.",
  },
  {
    type: "content",
    title: "The basic loop",
    body: "Add slides, shape the story, group by section, present, then export a backup or offline copy.",
    imageDataUrls: [],
    fontSize: 44,
    section: "Start",
    notes: "The editor auto-saves locally and syncs to the cloud when available.",
  },
  {
    type: "code",
    title: "Code slides",
    code: "function greet(name: string) {\n  return `Hello, ${name}`;\n}\n\nconsole.log(greet(\"Ada\"));",
    language: "typescript",
    section: "Code",
    notes: "Code slides are ideal for walkthroughs, refactors, and reveal sequences.",
  },
  {
    type: "code",
    title: "Animated code changes",
    code: "const greet = (name: string) => `Hello, ${name}`;\n\nconst people = [\"Ada\", \"Grace\", \"Linus\"];\npeople.map(greet).forEach((line) => console.log(line));",
    language: "typescript",
    section: "Code",
    notes: "Put related code slides next to each other to make the motion easy to follow.",
  },
  {
    type: "mermaid",
    title: "Diagrams",
    source: "flowchart LR\n  Idea[Idea] --> Draft[Draft slides]\n  Draft --> Present[Present]\n  Present --> Export[PDF or offline HTML]",
    section: "Diagrams",
    notes: "Mermaid slides are useful for systems, flows, sequences, and decisions.",
  },
  {
    type: "content",
    title: "Presenter mode",
    body: "Use notes, next-slide preview, section context, and elapsed time while the audience sees the main deck.",
    imageDataUrls: [],
    fontSize: 42,
    section: "Present",
    notes: "Open the presenter window when you want a private control surface.",
  },
  {
    type: "content",
    title: "Export paths",
    body: "PDF is best for sharing. Offline HTML is best when the talk needs to run without the app. JSON is best for backups.",
    imageDataUrls: [],
    fontSize: 40,
    section: "Ship",
    notes: "Try each export once before a real talk so you know which format fits the venue.",
  },
];

const starterTemplates: PresentationTemplate[] = [
  {
    id: "technical-talk",
    name: "Technical Talk",
    description: "A balanced talk with framing, code, diagrams, and takeaways.",
    slides: [
      {
        type: "content",
        title: "Talk title",
        body: "One clear sentence about the problem this talk solves.",
        imageDataUrls: [],
        fontSize: 54,
        section: "Opening",
      },
      {
        type: "content",
        title: "Why it matters",
        body: "Context, constraints, and what the audience should care about.",
        imageDataUrls: [],
        fontSize: 44,
        section: "Opening",
      },
      {
        type: "code",
        title: "Core example",
        code: "type Result<T> =\n  | { ok: true; value: T }\n  | { ok: false; error: string };\n\nfunction parse(input: string): Result<number> {\n  const value = Number(input);\n  return Number.isFinite(value)\n    ? { ok: true, value }\n    : { ok: false, error: \"Invalid number\" };\n}",
        language: "typescript",
        section: "Demo",
      },
      {
        type: "code",
        title: "Core example: named errors",
        code: "type ParseError = \"empty\" | \"not-a-number\";\n\ntype Result<T> =\n  | { ok: true; value: T }\n  | { ok: false; error: ParseError };\n\nfunction parse(input: string): Result<number> {\n  const trimmed = input.trim();\n  if (!trimmed) return { ok: false, error: \"empty\" };\n\n  const value = Number(trimmed);\n  return Number.isFinite(value)\n    ? { ok: true, value }\n    : { ok: false, error: \"not-a-number\" };\n}",
        language: "typescript",
        section: "Demo",
      },
      {
        type: "code",
        title: "Core example: range constraints",
        code: "type ParseError = \"empty\" | \"not-a-number\" | \"out-of-range\";\ntype Result<T> = { ok: true; value: T } | { ok: false; error: ParseError };\n\nfunction parseScore(input: string): Result<number> {\n  const trimmed = input.trim();\n  const value = Number(trimmed);\n\n  if (!trimmed) return { ok: false, error: \"empty\" };\n  if (!Number.isFinite(value)) return { ok: false, error: \"not-a-number\" };\n  if (value < 1 || value > 10) return { ok: false, error: \"out-of-range\" };\n\n  return { ok: true, value };\n}",
        language: "typescript",
        section: "Demo",
      },
      {
        type: "code",
        title: "Core example: caller flow",
        code: "type ParseError = \"empty\" | \"not-a-number\" | \"out-of-range\";\n\nconst errorMessage: Record<ParseError, string> = {\n  empty: \"Add a score first\",\n  \"not-a-number\": \"Use digits only\",\n  \"out-of-range\": \"Pick 1-10\",\n};\n\nexport function labelScore(input: string) {\n  const result = parseScore(input);\n  if (result.ok) return `Score: ${result.value}/10`;\n  return errorMessage[result.error];\n}",
        language: "typescript",
        section: "Demo",
      },
      {
        type: "mermaid",
        title: "System shape",
        source: "flowchart TB\n  UI[UI] --> API[API]\n  API --> Domain[Domain logic]\n  Domain --> Store[(Storage)]",
        section: "Demo",
      },
      {
        type: "content",
        title: "Takeaways",
        body: "1. Name the tradeoff\n2. Show the smallest useful example\n3. End with the decision people can reuse",
        imageDataUrls: [],
        fontSize: 46,
        section: "Close",
      },
    ],
  },
  {
    id: "code-walkthrough",
    name: "Code Walkthrough",
    description: "A progressive sequence for explaining a refactor or feature build.",
    slides: [
      {
        type: "content",
        title: "Code walkthrough",
        body: "Start with the outcome, then reveal the implementation in small steps.",
        imageDataUrls: [],
        fontSize: 52,
        section: "Setup",
      },
      {
        type: "code",
        title: "Step 1: baseline",
        code: "export function total(items: number[]) {\n  let sum = 0;\n  for (const item of items) {\n    sum += item;\n  }\n  return sum;\n}",
        language: "typescript",
        section: "Build",
      },
      {
        type: "code",
        title: "Step 2: extract intent",
        code: "const add = (left: number, right: number) => left + right;\n\nexport function total(items: number[]) {\n  return items.reduce(add, 0);\n}",
        language: "typescript",
        section: "Build",
      },
      {
        type: "code",
        title: "Step 3: name the reusable idea",
        code: "const add = (left: number, right: number) => left + right;\n\nexport function sum(items: number[]) {\n  return items.reduce(add, 0);\n}\n\nexport const average = (items: number[]) => sum(items) / items.length;",
        language: "typescript",
        section: "Build",
      },
      {
        type: "content",
        title: "Narration beats",
        body: "Show the before state, change one thing, explain the payoff, then connect it to the larger design.",
        imageDataUrls: [],
        fontSize: 42,
        section: "Close",
      },
    ],
  },
  {
    id: "architecture-review",
    name: "Architecture Review",
    description: "A deck for walking through boundaries, flow, risks, and decisions.",
    slides: [
      {
        type: "content",
        title: "Architecture review",
        body: "Frame the decision, the constraints, and the shape of the system.",
        imageDataUrls: [],
        fontSize: 52,
        section: "Context",
      },
      {
        type: "mermaid",
        title: "Current flow",
        source: "sequenceDiagram\n  participant User\n  participant App\n  participant API\n  participant Store\n  User->>App: Create or edit\n  App->>API: Save\n  API->>Store: Persist\n  Store-->>API: Confirm\n  API-->>App: Saved",
        section: "System",
      },
      {
        type: "mermaid",
        title: "Boundary map",
        source: "flowchart TB\n  Client[Client app]\n  Auth[Auth boundary]\n  Data[Data service]\n  Export[Export service]\n  Client --> Auth\n  Client --> Data\n  Client --> Export",
        section: "System",
      },
      {
        type: "content",
        title: "Tradeoffs",
        body: "Reliability, latency, cost, team ownership, and the next migration path.",
        imageDataUrls: [],
        fontSize: 42,
        section: "Decision",
      },
      {
        type: "content",
        title: "Decision log",
        body: "Chosen path\nRejected alternatives\nRisks to watch\nFollow-up owners",
        imageDataUrls: [],
        fontSize: 46,
        section: "Decision",
      },
    ],
  },
];

function createSlide(draft: SlideDraft): Slide {
  return { ...draft, id: generateId() } as Slide;
}

function createPresentation(name: string, slides: SlideDraft[]): Presentation {
  return {
    id: generateId(),
    name,
    slides: slides.map(createSlide),
    activeSlideIndex: 0,
  };
}

export const PRESENTATION_TEMPLATES = starterTemplates;

export function createTutorialPresentation(): Presentation {
  return createPresentation("slidedude Tutorial", tutorialSlides);
}

export function createPresentationFromTemplate(templateId: string): Presentation | null {
  const template = starterTemplates.find((item) => item.id === templateId);
  if (!template) return null;
  return createPresentation(template.name, template.slides);
}
