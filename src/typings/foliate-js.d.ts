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
	type Rects = {
		top?: number;
		bottom?: number;
		left?: number;
		right?: number;
		height?: number;
		width?: number;
	};

	export type DrawFunc = (rects: Rects, options?: any) => void;

	export class Overlayer {
		get element(): HTMLOrSVGElement;
		static underline: DrawFunc;
		static highlight: DrawFunc;
		static strikethrough: DrawFunc;
		static squiggly: DrawFunc;
		static outline: DrawFunc;
	}
}

declare module "@/lib/foliate-js/epub" {
	export type NavItem = {
		id: number;
		label: string;
		href: string;
		subitems: NavItem[] | null;
	};
	export type TOC = NavItem[];
	export class EPUB {
		toc: TOC;
		metadata: any;
		rendition: any;
		media: any;
		dir: any;

		constructor(params: {
			loadText: any;
			loadBlob: any;
			getSize: (name: string) => number;
			sha1?: any;
		});
		init(): Promise<EPUB>;
	}
}

declare module "@/lib/foliate-js/view" {
	import type { EPUB, NavItem } from "@/lib/foliate-js/epub";
	import type { CFI } from "@/lib/foliate-js/epubcfi";
	import type { DrawFunc, Overlayer } from "@/lib/foliate-js/overlayer";

	type Annotation = {
		value: string;
		color?: string;
	};

	interface Paginator extends HTMLElement {
		heads: HTMLElement[];
		feet: HTMLElement[];
		next(): Promise<void>;
		setStyles(styles: any): void;
		getContents():
			| [
					{
						doc: Document;
						overlayer: Overlayer;
						index: number;
					},
			  ]
			| [];
	}

	// https://github.com/vaadin/web-components/issues/350
	interface FoliateViewElementEventMap {
		load: CustomEvent<{ index: number; doc: Document }>;
		"draw-annotation": CustomEvent<{
			draw: (func: DrawFunc, opts?: any) => void;
			annotation: Annotation;
			doc: Document;
			range: Range;
		}>;
		"show-annotation": CustomEvent<{
			value: CFI;
			range: Range;
			index: number;
		}>;
		relocate: CustomEvent<{
			fraction: any;
			location: any;
			tocItem: NavItem;
			pageItem: any;
		}>;
		"text-selected": CustomEvent<{
			selection: Selection;
			cfi: CFI;
		}>;
	}

	export class View extends HTMLElement {
		book: EPUB;
		renderer: Paginator;
		open(book: any): Promise<void>;
		close(): void;
		goLeft(): Promise<void>;
		goRight(): Promise<void>;
		getCFI(index: number, range?: Range): CFI;
		addAnnotation(annotation: Annotation, remove?: boolean): Promise<void>;
		deleteAnnotation(annotation: Annotation);
		addEventListener<K extends keyof FoliateViewElementEventMap>(
			type: K,
			listener: (this: HTMLElement, ev: FoliateViewElementEventMap[K]) => any,
			options?: boolean | AddEventListenerOptions,
		): void;
	}
}
