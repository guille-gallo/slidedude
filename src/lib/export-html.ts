import "server-only";
import { createElement } from "react";
import { createHighlighter } from "shiki/bundle/web";
import { codeToKeyedTokens, syncTokenKeys } from "shiki-magic-move/core";
import type { KeyedTokensInfo } from "shiki-magic-move/types";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Presentation, Slide } from "@/types";
import { groupSections } from "@/lib/sections";
import { slideMarkdownComponents } from "@/lib/slide-markdown-components";

const LANGS = [
  "typescript",
  "javascript",
  "html",
  "css",
  "json",
  "python",
  "markdown",
  "jsx",
  "tsx",
] as const;

/** Safely embed a value as JSON inside a <script> tag.
 *  Escapes < > & to Unicode escapes so no HTML-significant bytes appear. */
function safeJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
}

/** Sanitize a presentation name into a safe filename stem. */
export function safeFilename(name: string): string {
  return (
    name
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "presentation"
  );
}

interface TransitionPair {
  from: KeyedTokensInfo;
  to: KeyedTokensInfo;
}

interface ExportData {
  slides: Slide[];
  sections: ReturnType<typeof groupSections>;
  /** Base KeyedTokensInfo per code-slide index (used for replace / initial render). */
  codeTokens: Record<number, KeyedTokensInfo>;
  /** Synced transition pairs for adjacent code-slide pairs. Key = "i_j". */
  transitions: Record<string, TransitionPair>;
  /** Pre-rendered markdown HTML per content-slide index. */
  bodyHtml: Record<number, string>;
}

async function buildExportData(presentation: Presentation): Promise<ExportData> {
  const { slides } = presentation;

  const highlighter = await createHighlighter({
    themes: ["github-dark"],
    langs: [...LANGS],
  });

  // Pre-compute tokens for every code slide.
  const codeTokens: Record<number, KeyedTokensInfo> = {};
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (slide.type !== "code") continue;
    const lang = LANGS.includes(slide.language as (typeof LANGS)[number])
      ? slide.language
      : "typescript";
    codeTokens[i] = codeToKeyedTokens(highlighter, slide.code, {
      lang: lang as Parameters<typeof highlighter.codeToTokens>[1]["lang"],
      theme: "github-dark",
    });
  }

  // Pre-compute synced transition pairs for every adjacent code-slide pair.
  const transitions: Record<string, TransitionPair> = {};
  for (let i = 0; i < slides.length - 1; i++) {
    if (slides[i].type !== "code" || slides[i + 1].type !== "code") continue;
    const { from, to } = syncTokenKeys(codeTokens[i], codeTokens[i + 1], {});
    transitions[`${i}_${i + 1}`] = { from, to };
  }

  // Pre-render markdown bodies for content slides.
  const bodyHtml: Record<number, string> = {};
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    if (slide.type !== "content" || !slide.body) continue;
    bodyHtml[i] = renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        { remarkPlugins: [remarkGfm], components: slideMarkdownComponents },
        slide.body
      )
    );
  }

  return {
    slides,
    sections: groupSections(slides),
    codeTokens,
    transitions,
    bodyHtml,
  };
}

// ---------------------------------------------------------------------------
// Inlined MagicMoveRenderer (from shiki-magic-move/renderer — no external deps)
// ---------------------------------------------------------------------------
const MAGIC_MOVE_RENDERER_JS = `
const CLASS_PREFIX='shiki-magic-move';
const CLASS_LEAVE_FROM=CLASS_PREFIX+'-leave-from';
const CLASS_LEAVE_TO=CLASS_PREFIX+'-leave-to';
const CLASS_LEAVE_ACTIVE=CLASS_PREFIX+'-leave-active';
const CLASS_ENTER_FROM=CLASS_PREFIX+'-enter-from';
const CLASS_ENTER_TO=CLASS_PREFIX+'-enter-to';
const CLASS_ENTER_ACTIVE=CLASS_PREFIX+'-enter-active';
const CLASS_MOVE=CLASS_PREFIX+'-move';
const CLASS_CONTAINER_RESIZE=CLASS_PREFIX+'-container-resize';
const CLASS_CONTAINER_RESTYLE=CLASS_PREFIX+'-container-restyle';
const defaultMagicMoveOptions={globalScale:1,duration:500,delayMove:.3,delayLeave:.1,delayEnter:.7,delayContainer:.4,stagger:0,easing:'ease',animateContainer:true,containerStyle:true};
class MagicMoveRenderer{
  mapDom=new Map();previousPromises=[];isFirstRender=true;
  constructor(target,options={}){
    this.options={...defaultMagicMoveOptions,...options};
    this.container=typeof target==='string'?document.querySelector(target):target;
    this.anchor=document.createElement('span');
    this.anchor.style.cssText='position:absolute;top:0;left:0;height:1px;width:1px;';
    this.container.prepend(this.anchor);
  }
  applyElementContent(el,token){if(token.content!=='\\n'){el.textContent=token.content;el.classList.add(CLASS_PREFIX+'-item');}}
  applyElementStyle(el,token){
    if(token.htmlStyle){if(typeof token.htmlStyle==='string')el.setAttribute('style',token.htmlStyle);else for(const[k,v]of Object.entries(token.htmlStyle))el.style.setProperty(k,v);}
    if(token.htmlClass)el.className=[CLASS_PREFIX+'-item',token.htmlClass].join(' ');
    if(token.color)el.style.color=token.color;
    if(token.bgColor)el.style.backgroundColor=token.bgColor;
  }
  applyElement(el,token){this.applyElementContent(el,token);this.applyElementStyle(el,token);}
  applyNodeStyle(node,step){
    // NOTE: intentionally skip step.bg so the <pre> stays transparent and matches the
    // page background (mirrors the look of the live presenter, where the surrounding
    // theme background is suppressed). Each token still carries its own color/bgColor.
    if(step.fg)node.style.color=step.fg;
    if(step.rootStyle){for(const item of step.rootStyle.split(';')){const[k,v]=item.split(':');if(k&&v){if(k.trim().toLowerCase()==='background-color'||k.trim().toLowerCase()==='background')continue;node.style.setProperty(k.trim(),v.trim());}}}
  }
  applyContainerStyle(step){if(this.options.containerStyle)this.applyNodeStyle(this.container,step);}
  registerTransitionEnd(el,cb){
    return()=>{
      let resolved=false,resolve=()=>{};
      const promise=Promise.race([
        Promise.allSettled(el.getAnimations().map(a=>a.finished)).then(()=>cb()),
        new Promise(_r=>{resolve=()=>{if(resolved)return;resolved=true;cb();_r();}})
      ]);
      promise.resolve=resolve;return promise;
    };
  }
  setCssVariables(){
    const s=this.container.style;
    s.setProperty('--smm-duration',this.options.duration+'ms');
    s.setProperty('--smm-delay-move',''+this.options.delayMove);
    s.setProperty('--smm-delay-leave',''+this.options.delayLeave);
    s.setProperty('--smm-delay-enter',''+this.options.delayEnter);
    s.setProperty('--smm-delay-container',''+this.options.delayContainer);
    s.setProperty('--smm-easing',this.options.easing);
    s.setProperty('--smm-stagger','0');
  }
  replace(step){
    const newMap=new Map();
    const children=step.tokens.map(token=>{
      if(this.mapDom.has(token.key)){const el=this.mapDom.get(token.key);this.applyElement(el,token);newMap.set(token.key,el);this.mapDom.delete(token.key);return el;}
      const el=document.createElement(token.content==='\\n'?'br':'span');this.applyElement(el,token);newMap.set(token.key,el);return el;
    });
    this.container.replaceChildren(this.anchor,...children);
    this.applyContainerStyle(step);this.mapDom=newMap;
  }
  render(step){
    this.setCssVariables();
    const newMap=new Map(),move=[],enter=[],leave=[],promises=[];
    this.previousPromises.forEach(p=>p.resolve());this.previousPromises=[];
    const postReflow=[],{globalScale:scale}=this.options;
    const position=new Map();
    let anchorRect=this.anchor.getBoundingClientRect();
    const containerRect=this.container.getBoundingClientRect();
    for(const el of this.mapDom.values()){const r=el.getBoundingClientRect();position.set(el,{x:r.x-anchorRect.x,y:r.y-anchorRect.y});}
    const newChildren=step.tokens.map(token=>{
      if(this.mapDom.has(token.key)){
        const el=this.mapDom.get(token.key);this.applyElementContent(el,token);
        postReflow.push(()=>this.applyElementStyle(el,token));
        move.push(el);newMap.set(token.key,el);this.mapDom.delete(token.key);return el;
      }
      const el=document.createElement(token.content==='\\n'?'br':'span');this.applyElement(el,token);enter.push(el);newMap.set(token.key,el);return el;
    });
    for(const[,el]of this.mapDom)if(el.tagName!=='BR')leave.push(el);
    for(const el of leave)el.style.position='absolute';
    this.container.replaceChildren(this.anchor,...newChildren,...leave);
    this.mapDom=newMap;
    leave.forEach((el,idx)=>{
      el.style.position='absolute';const pos=position.get(el);el.style.top=pos.y/scale+'px';el.style.left=pos.x/scale+'px';
      if(this.options.stagger)el.style.setProperty('--smm-stagger',idx*this.options.stagger+'ms');else el.style.removeProperty('--smm-stagger');
      el.classList.add(CLASS_LEAVE_FROM,CLASS_LEAVE_ACTIVE);
      postReflow.unshift(()=>{el.classList.remove(CLASS_LEAVE_FROM);el.classList.add(CLASS_LEAVE_TO);});
      promises.push(this.registerTransitionEnd(el,()=>{el.classList.remove(CLASS_LEAVE_FROM,CLASS_LEAVE_ACTIVE,CLASS_ENTER_TO);el.remove();}));
    });
    if(!this.isFirstRender){
      enter.forEach((el,idx)=>{
        el.classList.add(CLASS_ENTER_FROM,CLASS_ENTER_ACTIVE);
        if(this.options.stagger)el.style.setProperty('--smm-stagger',idx*this.options.stagger+'ms');else el.style.removeProperty('--smm-stagger');
        postReflow.push(()=>{el.classList.remove(CLASS_ENTER_FROM);el.classList.add(CLASS_ENTER_TO);});
        promises.push(this.registerTransitionEnd(el,()=>{el.classList.remove(CLASS_ENTER_FROM,CLASS_ENTER_ACTIVE,CLASS_ENTER_TO);}));
      });
    }
    anchorRect=this.anchor.getBoundingClientRect();
    move.forEach((el,idx)=>{
      const nr=el.getBoundingClientRect(),newPos={x:nr.x-anchorRect.x,y:nr.y-anchorRect.y},oldPos=position.get(el);
      el.style.transitionDuration=el.style.transitionDelay='0ms';
      el.style.transform='translate('+(oldPos.x-newPos.x)/scale+'px,'+(oldPos.y-newPos.y)/scale+'px)';
      if(this.options.stagger)el.style.setProperty('--smm-stagger',idx*this.options.stagger+'ms');else el.style.removeProperty('--smm-stagger');
      postReflow.unshift(()=>{el.classList.add(CLASS_MOVE);el.style.transform=el.style.transitionDuration=el.style.transitionDelay='';});
      promises.push(this.registerTransitionEnd(el,()=>el.classList.remove(CLASS_MOVE)));
    });
    if(this.options.animateContainer&&!this.isFirstRender){
      const nr=this.container.getBoundingClientRect();
      if(nr.width!==containerRect.width||nr.height!==containerRect.height){
        this.container.style.transitionDuration=this.container.style.transitionDelay='0ms';
        this.container.style.height=containerRect.height/scale+'px';this.container.style.width=containerRect.width/scale+'px';
        postReflow.unshift(()=>{
          this.container.classList.add(CLASS_CONTAINER_RESIZE);
          this.container.style.transitionDuration=this.container.style.transitionDelay='';
          this.container.style.height=nr.height/scale+'px';this.container.style.width=nr.width/scale+'px';
        });
        promises.push(this.registerTransitionEnd(this.container,()=>{this.container.classList.remove(CLASS_CONTAINER_RESIZE);this.container.style.height=this.container.style.width='';}));
      }
    }
    if(this.options.containerStyle){
      if(this.isFirstRender){this.applyContainerStyle(step);}
      else{
        postReflow.push(()=>{this.container.classList.add(CLASS_CONTAINER_RESTYLE);this.applyContainerStyle(step);});
        promises.push(this.registerTransitionEnd(this.container,()=>this.container.classList.remove(CLASS_CONTAINER_RESTYLE)));
      }
    }
    document.body.offsetHeight; // force reflow
    postReflow.forEach(cb=>cb());
    const actualPromises=promises.map(p=>p());
    this.isFirstRender=false;this.previousPromises=actualPromises;
    return Promise.all(actualPromises).then();
  }
}
`;

// ---------------------------------------------------------------------------
// Inline CSS — magic-move + presentation styles
// ---------------------------------------------------------------------------
const MAGIC_MOVE_CSS = `.shiki-magic-move-container{position:relative;white-space:pre}.shiki-magic-move-line-number{opacity:.3;-webkit-user-select:none;-moz-user-select:none;user-select:none}.shiki-magic-move-item{display:inline-block;transition:color var(--smm-duration,.5s) var(--smm-easing,"ease")}.shiki-magic-move-enter-active,.shiki-magic-move-leave-active,.shiki-magic-move-move{transition:all var(--smm-duration,.5s) var(--smm-easing,"ease")}.shiki-magic-move-container-resize,.shiki-magic-move-container-restyle{transition:all var(--smm-duration,.5s) var(--smm-easing,"ease");transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-container,1))}.shiki-magic-move-move{transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-move,1) + var(--smm-stagger,0));z-index:1}.shiki-magic-move-enter-active{transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-enter,1) + var(--smm-stagger,0));z-index:1}.shiki-magic-move-leave-active{transition-delay:calc(var(--smm-duration,.5s)*var(--smm-delay-leave,1) + var(--smm-stagger,0))}.shiki-magic-move-enter-from,.shiki-magic-move-leave-to{opacity:0}br.shiki-magic-move-leave-active{display:none}`;

const PRESENTATION_CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;background:#000;color:#e4e4e7;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden;}
#app{display:flex;flex-direction:column;height:100vh;background:#000;outline:none;}
#app:focus{outline:none;}
/* Progress bar */
#progress-bar{display:flex;gap:4px;padding:12px 24px 0;flex-shrink:0;}
.pb-section{display:flex;flex:1;gap:2px;}
.pb-pip{height:4px;flex:1;border-radius:9999px;transition:background-color .2s;}
.pb-pip.past{background:rgba(52,211,153,.4);}
.pb-pip.current{background:rgb(52,211,153);}
.pb-pip.future{background:rgba(255,255,255,.06);}
/* Section label */
#section-label{flex-shrink:0;padding:8px 24px 0;text-align:center;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.3em;color:#52525b;}
/* Slide area */
#slide-area{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;overflow:hidden;padding:32px;}
.slide-inner{display:flex;flex-direction:column;align-items:center;gap:24px;width:100%;max-width:900px;min-height:0;max-height:100%;}
/* Code view */
#code-view{display:none;flex-direction:column;align-items:center;gap:24px;width:100%;min-height:0;max-height:100%;}
/* Wrapper matches live presenter: no background, no radius, no scrollbars during the
   magic-move container-resize animation. */
.code-wrapper{width:100%;flex:1;min-height:0;overflow:hidden;padding:24px;}
.magic-code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;line-height:1.6;tab-size:2;}

/* Content view */
#content-view{display:none;flex-direction:column;align-items:center;gap:24px;width:100%;text-align:center;}
#content-body{max-width:768px;white-space:pre-wrap;font-size:1.25rem;color:#a1a1aa;line-height:1.7;}
#content-body.is-markdown{white-space:normal;}
#content-body.is-markdown p{margin:0.5rem 0;}
#content-body.is-markdown h1,#content-body.is-markdown h2,#content-body.is-markdown h3{color:#f4f4f5;margin:0.75rem 0 0.5rem;font-weight:700;}
#content-body.is-markdown ul,#content-body.is-markdown ol{text-align:left;display:inline-block;margin:0.5rem 0;padding-left:1.5rem;}
#content-body.is-markdown li{margin:0.25rem 0;}
#content-body.is-markdown code{background:rgba(255,255,255,0.06);padding:0.1rem 0.35rem;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:0.9em;color:#6ee7b7;}
#content-body.is-markdown pre{text-align:left;background:rgba(0,0,0,0.4);padding:0.75rem;border-radius:6px;overflow:auto;margin:0.5rem 0;}
#content-body.is-markdown pre code{background:transparent;padding:0;color:#e4e4e7;}
#content-body.is-markdown blockquote{border-left:2px solid rgba(16,185,129,0.4);padding-left:0.75rem;font-style:italic;color:#a1a1aa;margin:0.5rem 0;text-align:left;}
#content-body.is-markdown a{color:#34d399;text-decoration:underline;}
#content-body.is-markdown table{display:inline-table;border-collapse:collapse;margin:0.75rem 0;border:1px solid rgba(255,255,255,0.1);border-radius:6px;overflow:hidden;}
#content-body.is-markdown th,#content-body.is-markdown td{padding:0.5rem 0.75rem;border-bottom:1px solid rgba(255,255,255,0.08);text-align:left;}
#content-body.is-markdown th{background:rgba(255,255,255,0.04);color:#e4e4e7;font-weight:600;}
#content-body.is-markdown td{color:#d4d4d8;}
#content-body.is-markdown hr{border:none;border-top:1px solid rgba(255,255,255,0.1);margin:0.75rem 0;}
#content-images{display:none;width:100%;flex:1 1 0;min-height:0;gap:8px;grid-auto-rows:1fr;}
#content-images.has-images{display:grid;}
#content-images.cols-1{grid-template-columns:1fr;}
#content-images.cols-2{grid-template-columns:1fr 1fr;}
#content-images.cols-3{grid-template-columns:1fr 1fr 1fr;}
#content-images.cols-4{grid-template-columns:1fr 1fr 1fr 1fr;}
.content-img-cell{position:relative;width:100%;overflow:hidden;border-radius:8px;cursor:zoom-in;border:none;background:transparent;padding:0;}
.content-img-cell img{width:100%;height:100%;object-fit:contain;}
/* Lightbox */
#image-lightbox{display:none;position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.95);align-items:center;justify-content:center;}
#image-lightbox.visible{display:flex;}
#image-lightbox .lb-img-wrap{position:relative;width:95vw;height:95vh;}
#image-lightbox .lb-img-wrap img{width:100%;height:100%;object-fit:contain;}
#image-lightbox .lb-close{position:absolute;top:16px;right:16px;z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
#image-lightbox .lb-close:hover{background:rgba(255,255,255,.2);}
#image-lightbox .lb-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:10;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);border:none;color:#fff;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
#image-lightbox .lb-arrow:hover{background:rgba(255,255,255,.2);}
#image-lightbox .lb-prev{left:16px;}
#image-lightbox .lb-next{right:16px;}
#image-lightbox .lb-counter{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,.1);border-radius:16px;padding:4px 12px;font-size:.875rem;color:rgba(255,255,255,.7);}
/* Mermaid view */
#mermaid-view{display:none;flex-direction:column;align-items:center;gap:24px;width:100%;}
#mermaid-container{width:100%;min-height:300px;max-height:70vh;display:flex;align-items:center;justify-content:center;overflow:hidden;}
#mermaid-container svg{width:100%;height:100%;max-height:70vh;background:transparent;}
#mermaid-fallback{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:#a1a1aa;background:#111;border:1px solid #333;border-radius:8px;padding:24px;white-space:pre;overflow:auto;max-height:60vh;width:100%;}
/* Slide title */
.slide-title{font-size:1.875rem;font-weight:700;color:#f4f4f5;flex-shrink:0;}
/* Nav bar */
#nav-bar{display:flex;align-items:center;justify-content:space-between;padding:12px 24px;flex-shrink:0;}
.nav-btn{background:transparent;border:none;cursor:pointer;border-radius:6px;padding:6px 12px;font-size:.875rem;color:#71717a;transition:background .15s,color .15s;}
.nav-btn:hover{background:rgba(255,255,255,.04);color:#e4e4e7;}
.nav-btn:disabled{opacity:.3;cursor:default;}
#slide-counter{font-size:.875rem;color:#71717a;}
.nav-right{display:flex;align-items:center;gap:8px;}
/* Overview overlay */
#overview{display:none;position:fixed;inset:0;z-index:20;background:rgba(0,0,0,.95);backdrop-filter:blur(4px);overflow:auto;padding:32px;}
#overview.visible{display:block;}
.overview-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.overview-header h2{font-family:ui-monospace,monospace;font-size:.875rem;text-transform:uppercase;letter-spacing:.15em;color:#52525b;}
.overview-hint{font-size:.75rem;color:#3f3f46;}
.overview-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.overview-thumb{aspect-ratio:16/9;display:flex;flex-direction:column;justify-content:space-between;padding:12px;border-radius:8px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);cursor:pointer;text-align:left;transition:border-color .15s,background .15s;}
.overview-thumb:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.05);}
.overview-thumb.active{border-color:rgb(52,211,153);background:rgba(52,211,153,.1);box-shadow:0 0 20px -4px rgba(52,211,153,.4);}
.overview-thumb-top{display:flex;justify-content:space-between;font-family:ui-monospace,monospace;font-size:10px;}
.overview-thumb-num{color:#52525b;}
.overview-thumb-type{border-radius:4px;padding:2px 6px;text-transform:uppercase;letter-spacing:.05em;font-size:9px;}
.type-code{background:rgba(52,211,153,.1);color:rgb(52,211,153);}
.type-content{background:rgba(167,139,250,.1);color:rgb(167,139,250);}
.type-mermaid{background:rgba(56,189,248,.1);color:rgb(56,189,248);}
.overview-thumb-title{font-size:.875rem;font-weight:500;color:#e4e4e7;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;}
.overview-thumb-section{font-family:ui-monospace,monospace;font-size:9px;text-transform:uppercase;letter-spacing:.15em;color:#52525b;}
/* Content body shrink-0 so grid gets remaining space */
#content-body{flex-shrink:0;}
`;

// ---------------------------------------------------------------------------
// HTML template
// ---------------------------------------------------------------------------
function buildHtml(data: ExportData, presentationName: string): string {
  const { slides, sections, codeTokens, transitions, bodyHtml } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${presentationName.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</title>
<style>
${MAGIC_MOVE_CSS}
${PRESENTATION_CSS}
</style>
</head>
<body>
<div id="app" tabindex="0">
  <div id="progress-bar" aria-hidden="true"></div>
  <div id="section-label"></div>
  <div id="slide-area">
    <div id="code-view">
      <h1 class="slide-title" id="code-title"></h1>
      <div class="code-wrapper">
        <pre id="magic-move-container" class="shiki-magic-move-container magic-code"></pre>
      </div>
    </div>
    <div id="content-view">
      <h1 class="slide-title" id="content-title"></h1>
      <div id="content-body"></div>
      <div id="content-images"></div>
    </div>
    <div id="mermaid-view">
      <h1 class="slide-title" id="mermaid-title"></h1>
      <div id="mermaid-container"></div>
    </div>
  </div>
  <div id="nav-bar">
    <button class="nav-btn" id="btn-prev" disabled>← Prev</button>
    <span id="slide-counter"></span>
    <div class="nav-right">
      <button class="nav-btn" id="btn-overview" title="Overview (G)" aria-label="Toggle overview">▦</button>
      <button class="nav-btn" id="btn-fullscreen" title="Fullscreen (F)">⛶</button>
      <button class="nav-btn" id="btn-next">Next →</button>
    </div>
  </div>
</div>
<div id="overview" role="dialog" aria-label="Slide overview">
  <div class="overview-header">
    <h2>Overview</h2>
    <span class="overview-hint">Esc or G to close</span>
  </div>
  <div class="overview-grid" id="overview-grid"></div>
</div>
<div id="image-lightbox" role="dialog" aria-modal="true" aria-hidden="true">
  <button class="lb-close" aria-label="Close image zoom">&#x2715;</button>
  <button class="lb-arrow lb-prev" aria-label="Previous image">&#8592;</button>
  <div class="lb-img-wrap"><img id="image-lightbox-img" alt=""></div>
  <button class="lb-arrow lb-next" aria-label="Next image">&#8594;</button>
  <span class="lb-counter" id="lb-counter"></span>
</div>
<script>
${MAGIC_MOVE_RENDERER_JS}

const SLIDES = ${safeJson(slides)};
const SECTIONS = ${safeJson(sections)};
const CODE_TOKENS = ${safeJson(codeTokens)};
const TRANSITIONS = ${safeJson(transitions)};
const BODY_HTML = ${safeJson(bodyHtml)};

// ---- State ----------------------------------------------------------------
let currentIndex = 0;
let animating = false;
let overviewOpen = false;
const mermaidCache = {};   // index → rendered SVG string
let mermaidLib = null;     // mermaid library once loaded
let mermaidInitialized = false;
let mermaidRenderId = 0;

// ---- MagicMove renderer (single instance, one code container) -------------
const mmContainer = document.getElementById('magic-move-container');
const mmRenderer = new MagicMoveRenderer(mmContainer, {
  duration: 800,
  stagger: 0.3,
  delayMove: 0.3,
  delayLeave: 0.1,
  delayEnter: 0.7,
  delayContainer: 0.4,
  animateContainer: true,
  containerStyle: true,
});

// ---- DOM refs -------------------------------------------------------------
const appEl       = document.getElementById('app');
const codeView    = document.getElementById('code-view');
const contentView = document.getElementById('content-view');
const mermaidView = document.getElementById('mermaid-view');
const codeTitle   = document.getElementById('code-title');
const contentTitle = document.getElementById('content-title');
const contentBody  = document.getElementById('content-body');
const contentImages = document.getElementById('content-images');
const lightbox      = document.getElementById('image-lightbox');
const lightboxImg   = document.getElementById('image-lightbox-img');
const lbCounter     = document.getElementById('lb-counter');
const lbClose       = lightbox.querySelector('.lb-close');
const lbPrev        = lightbox.querySelector('.lb-prev');
const lbNext        = lightbox.querySelector('.lb-next');
let lbImages = [];  // images array for currently-shown slide
let lbIndex = 0;

function openLightbox(imgs, idx) {
  lbImages = imgs;
  showLightboxAt(idx);
  lightbox.classList.add('visible');
  lightbox.setAttribute('aria-hidden', 'false');
  lbPrev.style.display = imgs.length > 1 ? '' : 'none';
  lbNext.style.display = imgs.length > 1 ? '' : 'none';
  lbCounter.style.display = imgs.length > 1 ? '' : 'none';
}
function showLightboxAt(idx) {
  lbIndex = (idx + lbImages.length) % lbImages.length;
  lightboxImg.src = lbImages[lbIndex];
  lightboxImg.alt = 'Slide image ' + (lbIndex + 1);
  if (lbImages.length > 1) lbCounter.textContent = (lbIndex + 1) + ' / ' + lbImages.length;
}
function closeLightbox() {
  lightbox.classList.remove('visible');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImg.src = '';
  lbImages = [];
}
lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', function(e) { e.stopPropagation(); showLightboxAt(lbIndex - 1); });
lbNext.addEventListener('click', function(e) { e.stopPropagation(); showLightboxAt(lbIndex + 1); });
lightbox.addEventListener('click', function(e) { if (e.target === lightbox) closeLightbox(); });
// Capture-phase keydown: intercept Escape/arrows before slide-nav handler
window.addEventListener('keydown', function(e) {
  if (!lightbox.classList.contains('visible')) return;
  if (e.key === 'Escape') { e.stopPropagation(); closeLightbox(); }
  else if (e.key === 'ArrowLeft') { e.stopPropagation(); showLightboxAt(lbIndex - 1); }
  else if (e.key === 'ArrowRight') { e.stopPropagation(); showLightboxAt(lbIndex + 1); }
}, true);
const mermaidTitle = document.getElementById('mermaid-title');
const mermaidContainer = document.getElementById('mermaid-container');
const progressBar  = document.getElementById('progress-bar');
const sectionLabel = document.getElementById('section-label');
const slideCounter = document.getElementById('slide-counter');
const btnPrev      = document.getElementById('btn-prev');
const btnNext      = document.getElementById('btn-next');
const btnOverview  = document.getElementById('btn-overview');
const btnFullscreen = document.getElementById('btn-fullscreen');
const overviewEl   = document.getElementById('overview');
const overviewGrid = document.getElementById('overview-grid');

// ---- Progress bar ---------------------------------------------------------
function renderProgressBar(idx) {
  progressBar.innerHTML = '';
  if (SECTIONS.length === 0) return;
  SECTIONS.forEach(sec => {
    const secEl = document.createElement('div');
    secEl.className = 'pb-section';
    secEl.title = sec.name || '';
    for (let i = sec.start; i <= sec.end; i++) {
      const pip = document.createElement('div');
      pip.className = 'pb-pip ' + (i < idx ? 'past' : i === idx ? 'current' : 'future');
      secEl.appendChild(pip);
    }
    progressBar.appendChild(secEl);
  });
}

function renderSectionLabel(idx) {
  let name = null;
  for (const sec of SECTIONS) {
    if (idx >= sec.start && idx <= sec.end) { name = sec.name; break; }
  }
  sectionLabel.textContent = name || '';
  sectionLabel.style.display = name ? '' : 'none';
}

// ---- Mermaid --------------------------------------------------------------
async function ensureMermaid() {
  if (mermaidLib) return mermaidLib;
  return new Promise((resolve) => {
    if (window.mermaid) { mermaidLib = window.mermaid; resolve(mermaidLib); return; }
    // Mermaid CDN script may still be loading
    const check = setInterval(() => {
      if (window.mermaid) { clearInterval(check); mermaidLib = window.mermaid; resolve(mermaidLib); }
    }, 100);
    // Give up after 5s
    setTimeout(() => { clearInterval(check); resolve(null); }, 5000);
  });
}

async function renderMermaid(index, source) {
  const container = mermaidContainer;
  const rid = ++mermaidRenderId;

  if (mermaidCache[index]) {
    container.innerHTML = mermaidCache[index];
    return;
  }

  const mermaid = await ensureMermaid();
  if (!mermaid) {
    // Fallback: show source
    container.innerHTML = '';
    const pre = document.createElement('pre');
    pre.id = 'mermaid-fallback';
    pre.textContent = source;
    container.appendChild(pre);
    return;
  }

  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict',
      fontFamily: 'ui-sans-serif,system-ui,sans-serif',
      themeVariables: { background: 'transparent', clusterBkg: 'transparent' } });
    mermaidInitialized = true;
  }

  try {
    const { svg } = await mermaid.render('mermaid-export-' + index + '-' + rid, source);
    if (rid !== mermaidRenderId) return; // stale
    mermaidCache[index] = svg;
    container.innerHTML = svg;
    const svgEl = container.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('width'); svgEl.removeAttribute('height');
      svgEl.style.cssText = 'width:100%;height:100%;max-height:70vh;background:transparent;';
      svgEl.querySelectorAll('rect.background,.cluster-bkg').forEach(el => {
        el.setAttribute('fill', 'transparent'); el.setAttribute('stroke', 'none');
      });
    }
  } catch (e) {
    if (rid !== mermaidRenderId) return;
    container.innerHTML = '';
    const pre = document.createElement('pre');
    pre.id = 'mermaid-fallback';
    pre.textContent = source + '\\n\\n[Render error: ' + (e.message || e) + ']';
    container.appendChild(pre);
  }
}

// ---- Slide rendering ------------------------------------------------------
function showSlide(newIndex, animate) {
  const slide = SLIDES[newIndex];
  const prevIndex = currentIndex;

  // Show/hide views
  codeView.style.display    = slide.type === 'code'    ? 'flex' : 'none';
  contentView.style.display = slide.type === 'content' ? 'flex' : 'none';
  mermaidView.style.display = slide.type === 'mermaid' ? 'flex' : 'none';

  if (slide.type === 'code') {
    codeTitle.textContent = slide.title || '';
    codeTitle.style.display = slide.title ? '' : 'none';

    const tokens = CODE_TOKENS[newIndex];
    if (!tokens) return;

    const fwdKey = prevIndex + '_' + newIndex;
    const bwdKey = newIndex + '_' + prevIndex;

    if (animate && TRANSITIONS[fwdKey]) {
      animating = true;
      mmRenderer.render(TRANSITIONS[fwdKey].to).then(() => { animating = false; });
    } else if (animate && TRANSITIONS[bwdKey]) {
      animating = true;
      mmRenderer.render(TRANSITIONS[bwdKey].from).then(() => { animating = false; });
    } else {
      mmRenderer.replace(tokens);
    }

  } else if (slide.type === 'content') {
    contentTitle.textContent = slide.title || '';
    contentTitle.style.display = slide.title ? '' : 'none';
    const html = BODY_HTML[newIndex];
    if (html) {
      contentBody.innerHTML = html;
      contentBody.classList.add('is-markdown');
      contentBody.style.display = '';
    } else {
      contentBody.classList.remove('is-markdown');
      contentBody.textContent = slide.body || '';
      contentBody.style.display = slide.body ? '' : 'none';
    }
    // Legacy shim: old exports may have imageDataUrl instead of imageDataUrls
    const imgs = Array.isArray(slide.imageDataUrls)
      ? slide.imageDataUrls
      : (slide.imageDataUrl ? [slide.imageDataUrl] : []);
    contentImages.innerHTML = '';
    contentImages.className = '';
    if (imgs.length > 0) {
      var n = imgs.length;
      var cols = n === 1 ? 1 : n === 2 ? 2 : n === 3 ? 3 : n === 4 ? 2 : n <= 6 ? 3 : 4;
      contentImages.className = 'has-images cols-' + cols;
      imgs.forEach(function(src, i) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'content-img-cell';
        cell.setAttribute('aria-label', 'Zoom image ' + (i + 1));
        cell.addEventListener('click', (function(capturedSrc, capturedIdx) {
          return function() { openLightbox(imgs, capturedIdx); };
        })(src, i));
        const img = document.createElement('img');
        img.src = src;
        img.alt = 'Slide image ' + (i + 1);
        cell.appendChild(img);
        contentImages.appendChild(cell);
      });
    }

  } else if (slide.type === 'mermaid') {
    mermaidTitle.textContent = slide.title || '';
    mermaidTitle.style.display = slide.title ? '' : 'none';
    renderMermaid(newIndex, slide.source);
  }

  currentIndex = newIndex;
  renderProgressBar(currentIndex);
  renderSectionLabel(currentIndex);
  slideCounter.textContent = (currentIndex + 1) + ' / ' + SLIDES.length;
  btnPrev.disabled = currentIndex === 0;
  btnNext.disabled = currentIndex === SLIDES.length - 1;
}

// ---- Navigation -----------------------------------------------------------
function goTo(index, animate) {
  if (index < 0 || index >= SLIDES.length) return;
  if (animating) return;
  showSlide(index, animate !== false);
}

function next() { goTo(currentIndex + 1, true); }
function prev() { goTo(currentIndex - 1, true); }

// ---- Overview grid --------------------------------------------------------
function buildOverviewGrid() {
  overviewGrid.innerHTML = '';
  SLIDES.forEach((slide, i) => {
    const btn = document.createElement('button');
    btn.className = 'overview-thumb' + (i === currentIndex ? ' active' : '');
    btn.setAttribute('aria-label', 'Go to slide ' + (i + 1));
    const typeLabel = slide.type === 'mermaid' ? 'diagram' : slide.type;
    const typeClass = 'type-' + slide.type;
    const preview = slide.type === 'code' ? slide.code.slice(0, 60)
      : slide.type === 'mermaid' ? slide.source.split('\\n')[0]
      : slide.title || 'Untitled';
    btn.innerHTML =
      '<div class="overview-thumb-top">'
      + '<span class="overview-thumb-num">' + String(i + 1).padStart(2, '0') + '</span>'
      + '<span class="overview-thumb-type ' + typeClass + '">' + typeLabel + '</span>'
      + '</div>'
      + '<div class="overview-thumb-title">' + escHtml(slide.title || preview) + '</div>'
      + (slide.section ? '<div class="overview-thumb-section">' + escHtml(slide.section) + '</div>' : '');
    btn.onclick = () => { goTo(i, false); closeOverview(); };
    overviewGrid.appendChild(btn);
  });
}

function openOverview() {
  overviewOpen = true;
  buildOverviewGrid();
  overviewEl.classList.add('visible');
}

function closeOverview() {
  overviewOpen = false;
  overviewEl.classList.remove('visible');
  appEl.focus();
}

function toggleOverview() {
  overviewOpen ? closeOverview() : openOverview();
}

// ---- Keyboard / events ----------------------------------------------------
appEl.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    if (!overviewOpen) next();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (!overviewOpen) prev();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    if (overviewOpen) { closeOverview(); return; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  } else if (e.key === 'f' || e.key === 'F') {
    e.preventDefault();
    toggleFullscreen();
  } else if (e.key === 'g' || e.key === 'G') {
    e.preventDefault();
    toggleOverview();
  }
});

// Overview: close on backdrop click (not grid click)
overviewEl.addEventListener('click', e => {
  if (e.target === overviewEl) closeOverview();
});

btnPrev.onclick = () => prev();
btnNext.onclick = () => next();
btnOverview.onclick = () => toggleOverview();
btnFullscreen.onclick = () => toggleFullscreen();

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- Init -----------------------------------------------------------------
appEl.focus();
// Start fullscreen automatically (mirrors live present page behaviour)
document.documentElement.requestFullscreen().catch(() => {});
showSlide(0, false);
</script>
<!-- Mermaid via CDN (loads if network is available; gracefully degrades if blocked) -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js" crossorigin="anonymous"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export async function generateOfflineHtml(presentation: Presentation): Promise<string> {
  const data = await buildExportData(presentation);
  return buildHtml(data, presentation.name);
}
