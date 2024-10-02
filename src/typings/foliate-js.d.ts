declare namespace JSX {
  import type { View } from "@/lib/foliate-js/view";
  interface IntrinsicElements {
    "foliate-view": JSX.HTMLAttribus<View>;
  }
}

declare module "@/lib/foliate-js/epubcfi" {
  export type CFI = `epubcfi(${string})`;
}

declare module "@/lib/foliate-js/overlayer" {
  type Rects = { top?: number; bottom?: number; left?: number; right?: number; height?: number; width?: number }

  export class Overlayer {
    static underline(rects: Rects, options?: any): void;
    static highlight(rects: Rects, options?: any): void;
  }
}

declare module "@/lib/foliate-js/epub" {
  export class EPUB { }
}

declare module "@/lib/foliate-js/view" {
  import type { EPUB } from "@/lib/foliate-js/epub";
  import type { CFI } from '@/lib/foliate-js/epubcfi'

  type Annotation = {
    value: string;
    color?: string;
  }

  interface Paginator extends HTMLElement {
    next(): Promise<void>
  }

  // https://github.com/vaadin/web-components/issues/350
  interface FoliateViewElementEventMap {
    "load": CustomEvent<{ index: number; doc: Document }>;
    "draw-annotation": CustomEvent<{ draw: any; annotation: any }>;
  }

  export class View extends HTMLElement {
    renderer: Paginator;
    open(book: EPUB): Promise<void>;
    goLeft(): Promise<void>;
    goRight(): Promise<void>;
    getCFI(index: number, range?: Range): CFI
    addAnnotation(annotation: Annotation, remove?: boolean): Promise<void>
    addEventListener<K extends keyof FoliateViewElementEventMap>(type: K, listener: (this: HTMLElement, ev: FoliateViewElementEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  }
}
