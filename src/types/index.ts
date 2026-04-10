export interface CodeSlide {
  id: string;
  type: "code";
  title: string;
  code: string;
  language: string;
  theme: string;
}

export interface ContentSlide {
  id: string;
  type: "content";
  title: string;
  body: string;
  imageDataUrl: string | null;
  fontSize: number;
}

export type Slide = CodeSlide | ContentSlide;

export interface Presentation {
  id: string;
  name: string;
  slides: Slide[];
  activeSlideIndex: number;
}
