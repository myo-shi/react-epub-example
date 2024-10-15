import "@/lib/foliate-js/view";
import { EPUB } from "@/lib/foliate-js/epub";
import { Overlayer } from "@/lib/foliate-js/overlayer";
import type { View } from "@/lib/foliate-js/view";
import debounce from "lodash.debounce";
import {
	BlobReader,
	BlobWriter,
	TextWriter,
	ZipReader,
	configure,
} from "../../lib/foliate-js/vendor/zip.js";

const getCSS = ({
	spacing,
	justify,
	hyphenate,
}: {
	spacing: number;
	justify: boolean;
	hyphenate: boolean;
}) => `
    @namespace epub "http://www.idpf.org/2007/ops";
    html {
        color-scheme: light dark;
    }
    /* https://github.com/whatwg/html/issues/5426 */
    @media (prefers-color-scheme: dark) {
        a:link {
            color: lightblue;
        }
    }
    p, li, blockquote, dd {
        line-height: ${spacing};
        text-align: ${justify ? "justify" : "start"};
        -webkit-hyphens: ${hyphenate ? "auto" : "manual"};
        hyphens: ${hyphenate ? "auto" : "manual"};
        -webkit-hyphenate-limit-before: 3;
        -webkit-hyphenate-limit-after: 2;
        -webkit-hyphenate-limit-lines: 2;
        hanging-punctuation: allow-end last;
        widows: 2;
    }
    /* prevent the above from overriding the align attribute */
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }

    pre {
        white-space: pre-wrap !important;
    }
    aside[epub|type~="endnote"],
    aside[epub|type~="footnote"],
    aside[epub|type~="note"],
    aside[epub|type~="rearnote"] {
        display: none;
    }
`;

const makeZipLoader = async (file: File) => {
	configure({ useWebWorkers: false });
	const reader = new ZipReader(new BlobReader(file));
	const entries = (await reader.getEntries()) as any[];
	const map = new Map(entries.map((entry) => [entry.filename, entry]));
	const load =
		(fn: (entry: any, ...rest: any) => void) =>
		(name: string, ...args: any) =>
			map.has(name) ? fn(map.get(name), ...args) : null;
	const loadText = load((entry) => entry.getData(new TextWriter()));
	const loadBlob = load((entry, type) => entry.getData(new BlobWriter(type)));
	const getSize = (name: string) => map.get(name)?.uncompressedSize ?? 0;
	return { entries, loadText, loadBlob, getSize };
};

const getView = async (file: File, elm: View) => {
	const loader = await makeZipLoader(file);
	const book = await new EPUB(loader).init();
	if (!book) throw new Error("File type not supported");
	console.log("load book", book, elm);

	await elm.open(book);
	return elm;
};

export class Reader {
	view: View | null = null;
	isOpening = false;
	selectedText: string | null = null;
	style = {
		spacing: 1.4,
		justify: true,
		hyphenate: true,
	};

	async open(file: File, elm: View) {
		if (this.isOpening || !elm) return;

		this.isOpening = true;
		this.view = await getView(file, elm);
		this.view.addEventListener("load", this.#onLoad.bind(this));
		this.view.addEventListener("relocate", this.#onRelocate.bind(this));

		const { book } = this.view;
		console.log("toc", book.toc);
		this.view.renderer.setStyles?.(getCSS(this.style));
		this.view.renderer?.next();

		this.view.addEventListener("draw-annotation", (event) => {
			const { draw, annotation } = event.detail;
			const { color } = annotation;
			draw(Overlayer.highlight, { color });
		});
		this.view.addEventListener("show-annotation", (event) => {
			// This event will be dispatched when a user click any overlay.
			// For example, display an annotation when an overlay is clicked.
			console.log("show-annotation", event);
			// const annotation = this.annotationsByValue.get(e.detail.value);
			// if (annotation.note) alert(annotation.note);
		});
		return this.view;
	}

	#handleKeydown(event: KeyboardEvent) {
		const k = event.key;
		if (k === "ArrowLeft" || k === "h") this.view?.goLeft();
		else if (k === "ArrowRight" || k === "l") this.view?.goRight();
	}
	#handleWheel(event: WheelEvent) {
		event.preventDefault();
		const deltaY = Math.sign(event.deltaY);
		const deltaX = Math.sign(event.deltaX);
		if (deltaY > -1 || deltaX > 0) {
			this.view?.goLeft();
		} else {
			this.view?.goRight();
		}
	}
	#onLoad(event: { detail: { doc: Document; index: number } }) {
		const { detail } = event;
		const doc = detail.doc;
		doc.addEventListener("keydown", this.#handleKeydown.bind(this));
		doc.addEventListener("wheel", this.#handleWheel.bind(this));
		doc.addEventListener(
			"selectionchange",
			debounce(async () => {
				if (!this.view) return;
				const selection = doc.getSelection();
				this.selectedText = selection?.toString() ?? null;
				const cfi = this.view.getCFI(
					detail.index,
					doc.getSelection()?.getRangeAt(0),
				);
				console.log("cfi", cfi, detail.index);
				// this.view?.addAnnotation({ value: cfi });
				if (this.selectedText !== "" && this.selectedText !== null) {
					this.view.dispatchEvent(
						new CustomEvent("text-selected", {
							detail: { selection, cfi },
						}),
					);
				}

				const old = window.document.getElementById("selected");
				if (old) {
					window.document.body.removeChild(old);
				}
				const parentSelection = window.getSelection();
				if (parentSelection && parentSelection.rangeCount > 0) {
					parentSelection.removeAllRanges();
				}
				const elm = window.document.createElement("div");
				elm.innerText = this.selectedText ?? "";
				elm.id = "selected";
				elm.style.position = "absolute";
				elm.style.top = "0";
				elm.style.left = "0";
				elm.style.visibility = "hidden";

				window.document.body.appendChild(elm);
				const range = window.document.createRange();
				const target = window.document.getElementById("selected");
				if (target) {
					console.log("target", target);
					window.setTimeout(() => {
						range.selectNode(target);
						parentSelection?.addRange(range);
						console.log("range", range);
					}, 100);
				}
			}, 300),
		);
		doc.addEventListener("mousemove", (event) => {
			const container = this.view?.renderer.container;
			if (!container) {
				return;
			}
			const containerRect = container.getBoundingClientRect();
			const clientX = event.clientX + containerRect.left;
			const clientY = event.clientY + containerRect.top;
			const mouseEvent = new MouseEvent("mousemove", {
				bubbles: true,
				cancelable: true,
				clientX,
				clientY,
			});
			window.dispatchEvent(mouseEvent);
		});
		doc.addEventListener("pointerdown", (event) => {
			window.document.dispatchEvent(
				new MouseEvent("pointerdown", {
					bubbles: true,
					cancelable: true,
					screenX: event.screenX,
					screenY: event.screenY,
				}),
			);
		});
	}
	#onRelocate({ detail }: any) {
		if (!this.view) return;
		// const { fraction, location, tocItem, pageItem } = detail;
		const { heads, feet } = this.view.renderer;
		if (heads) {
			const { tocItem } = detail;
			heads.at(-1).innerText = tocItem?.label ?? "";
			if (heads.length > 1)
				heads[0].innerText = formatLanguageMap(this.view.book.metadata.title);
		}
		// const percent = percentFormat.format(fraction);
		// const loc = pageItem ? `Page ${pageItem.label}` : `Loc ${location.current}`;
		// const slider = $("#progress-slider");
		// slider.style.visibility = "visible";
		// slider.value = fraction;
		// slider.title = `${percent} · ${loc}`;
		// if (tocItem?.href) this.#tocView?.setCurrentHref?.(tocItem.href);
	}
}

const formatLanguageMap = (x) => {
	if (!x) return "";
	if (typeof x === "string") return x;
	const keys = Object.keys(x);
	return x[keys[0]];
};
