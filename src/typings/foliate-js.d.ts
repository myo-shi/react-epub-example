declare namespace JSX {
	import type { View } from "@/lib/foliate-js/view";
	interface IntrinsicElements {
		"foliate-view": JSX.HTMLAttribus<View>;
	}
}

declare module "@/lib/foliate-js/epub" {
	export class EPUB {}
}

declare module "@/lib/foliate-js/view" {
	import type { EPUB } from "@/lib/foliate-js/epub";

	interface Paginator extends HTMLElement {
		next(): Promise<void>;
	}

	export class View extends HTMLElement {
		renderer: Paginator;
		// book: File;
		// prev(): Promise<void>;
		open(book: EPUB): Promise<void>;
		goLeft(): Promise<void>;
		goRight(): Promise<void>;
	}
}
