export interface CodeSlide {
  id: string;
  type: "code";
  title: string;
  code: string;
  language: string;
  notes?: string;
  section?: string;
}

export interface ContentSlide {
  id: string;
  type: "content";
  title: string;
  body: string;
  imageDataUrls: string[];
  fontSize: number;
  notes?: string;
  section?: string;
}

export interface MermaidSlide {
  id: string;
  type: "mermaid";
  title: string;
  source: string;
  notes?: string;
  section?: string;
}

export type Slide = CodeSlide | ContentSlide | MermaidSlide;

export interface Presentation {
  id: string;
  name: string;
  slides: Slide[];
  activeSlideIndex: number;
}
