import "@/lib/foliate-js/view";
import { Overlayer } from "@/lib/foliate-js/overlayer";
import type { View } from "@/lib/foliate-js/view";
import debounce from "lodash.debounce";

type Theme = {
	light: {
		fg: string;
		bg: string;
		link: string;
	};
	dark: {
		fg: string;
		bg: string;
		link: string;
	};
};

const DEFAULT_THEME: Theme = {
	light: { fg: "#000000", bg: "#ffffff", link: "#0066cc" },
	dark: { fg: "#e0e0e0", bg: "#222222", link: "#77bbee" },
};

const getCSS = ({
	lineHeight = 1.5,
	justify = false,
	hyphenate = false,
	invert = false,
	theme = DEFAULT_THEME,
	overrideFont = false,
	userStylesheet = "",
	mediaActiveClass = "",
}) => [
	`
    @namespace epub "http://www.idpf.org/2007/ops";
    @media print {
        html {
            column-width: auto !important;
            height: auto !important;
            width: auto !important;
        }
    }
    @media screen {
        html {
            color-scheme: ${invert ? "only light" : "light dark"};
            color: ${theme.light.fg};
        }
        a:any-link {
            color: ${theme.light.link};
        }
        @media (prefers-color-scheme: dark) {
            html {
                color: ${invert ? theme.inverted.fg : theme.dark.fg};
                ${invert ? "-webkit-font-smoothing: antialiased;" : ""}
            }
            a:any-link {
                color: ${invert ? theme.inverted.link : theme.dark.link};
            }
        }
        aside[epub|type~="footnote"] {
            display: none;
        }
    }
    html {
        line-height: ${lineHeight};
        hanging-punctuation: allow-end last;
        orphans: 2;
        widows: 2;
    }
    [align="left"] { text-align: left; }
    [align="right"] { text-align: right; }
    [align="center"] { text-align: center; }
    [align="justify"] { text-align: justify; }
    :is(hgroup, header) p {
        text-align: unset;
        hyphens: unset;
    }
    pre {
        white-space: pre-wrap !important;
        tab-size: 2;
    }
`,
	`
    @media screen and (prefers-color-scheme: light) {
        ${
					theme.light.bg !== "#ffffff"
						? `
        html, body {
            color: ${theme.light.fg} !important;
            background: none !important;
        }
        body * {
            color: inherit !important;
            border-color: currentColor !important;
            background-color: ${theme.light.bg} !important;
        }
        a:any-link {
            color: ${theme.light.link} !important;
        }
        svg, img {
            background-color: transparent !important;
            mix-blend-mode: multiply;
        }
        .${CSS.escape(mediaActiveClass)}, .${CSS.escape(mediaActiveClass)} * {
            color: ${theme.light.fg} !important;
            background: color-mix(in hsl, ${theme.light.fg}, #fff 50%) !important;
            background: color-mix(in hsl, ${theme.light.fg}, ${theme.light.bg} 85%) !important;
        }`
						: ""
				}
    }
    @media screen and (prefers-color-scheme: dark) {
        ${
					invert
						? ""
						: `
        html, body {
            color: ${theme.dark.fg} !important;
            background: none !important;
        }
        body * {
            color: inherit !important;
            border-color: currentColor !important;
            background-color: ${theme.dark.bg} !important;
        }
        a:any-link {
            color: ${theme.dark.link} !important;
        }
        .${CSS.escape(mediaActiveClass)}, .${CSS.escape(mediaActiveClass)} * {
            color: ${theme.dark.fg} !important;
            background: color-mix(in hsl, ${theme.dark.fg}, #000 50%) !important;
            background: color-mix(in hsl, ${theme.dark.fg}, ${theme.dark.bg} 75%) !important;
        }`
				}
    }
    p, li, blockquote, dd {
        line-height: ${lineHeight};
        text-align: ${justify ? "justify" : "start"};
        hyphens: ${hyphenate ? "auto" : "none"};
    }
    ${overrideFont ? "* { font-family: revert !important }" : ""}
${userStylesheet}`,
];

const frameRect = (
	frame: { top: number; left: number },
	rect: DOMRect,
	sx = 1,
	sy = 1,
) => {
	const left = sx * rect.left + frame.left;
	const right = sx * rect.right + frame.left;
	const top = sy * rect.top + frame.top;
	const bottom = sy * rect.bottom + frame.top;
	return { left, right, top, bottom };
};

const pointIsInView = ({ x, y }: { x: number; y: number }) =>
	x > 0 && y > 0 && x < window.innerWidth && y < window.innerHeight;

export const getPosition = (
	target: Range,
): { point: { x: number; y: number }; dir?: "up" | "down" } => {
	const frameElement = (target?.endContainer?.getRootNode?.() as Document)
		?.defaultView?.frameElement;

	const transform = frameElement
		? getComputedStyle(frameElement).transform
		: "";
	const match = transform.match(/matrix\((.+)\)/);
	const [sx, , , sy] =
		match?.[1]?.split(/\s*,\s*/)?.map((x) => Number.parseFloat(x)) ?? [];

	const frame = frameElement?.getBoundingClientRect() ?? { top: 0, left: 0 };
	const rects = Array.from(target.getClientRects());
	const first = frameRect(frame, rects[0], sx, sy);
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	const last = frameRect(frame, rects.at(-1)!, sx, sy);
	const start = {
		point: { x: (first.left + first.right) / 2, y: first.top },
		dir: "up" as const,
	};
	const end = {
		point: { x: (last.left + last.right) / 2, y: last.bottom },
		dir: "down" as const,
	};
	const startInView = pointIsInView(start.point);
	const endInView = pointIsInView(end.point);
	if (!startInView && !endInView) return { point: { x: 0, y: 0 } };
	if (!startInView) return end;
	if (!endInView) return start;
	return start.point.y > window.innerHeight - end.point.y ? start : end;
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
	iframe: Element | null = null;

	setAppearance() {
		// Object.assign(this.style, style)
		// const { theme } = style
		const theme = DEFAULT_THEME;
		const $style = document.documentElement.style;
		$style.setProperty("--light-bg", theme.light.bg);
		$style.setProperty("--light-fg", theme.light.fg);
		$style.setProperty("--dark-bg", theme.dark.bg);
		$style.setProperty("--dark-fg", theme.dark.fg);
		// const renderer = this.view?.renderer
		// if (renderer) {
		// 		renderer.setAttribute('flow', layout.flow)
		// 		renderer.setAttribute('gap', layout.gap * 100 + '%')
		// 		renderer.setAttribute('max-inline-size', layout.maxInlineSize + 'px')
		// 		renderer.setAttribute('max-block-size', layout.maxBlockSize + 'px')
		// 		renderer.setAttribute('max-column-count', layout.maxColumnCount)
		// 		if (layout.animated) renderer.setAttribute('animated', '')
		// 		else renderer.removeAttribute('animated')
		// 		renderer.setStyles?.(getCSS(this.style))
		// }
		// document.body.classList.toggle('invert', this.style.invert)
		// if (autohideCursor) this.view?.setAttribute('autohide-cursor', '')
		// else this.view?.removeAttribute('autohide-cursor')
	}

	async open(file: File, elm: View) {
		if (this.isOpening || !elm) return;

		this.isOpening = true;
		this.view = elm;
		await this.view.open(file);
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
		this.setAppearance();
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
	#onLoad({ detail }: { detail: { doc: Document; index: number } }) {
		console.log("onLoad");
		const doc = detail.doc;
		this.iframe =
			this.view?.renderer.getContents()[0]?.doc.defaultView?.frameElement ??
			null;
		(this.iframe as HTMLElement).style.colorScheme = "light dark";

		doc.addEventListener("keydown", this.#handleKeydown.bind(this));
		doc.addEventListener("wheel", this.#handleWheel.bind(this));
		doc.addEventListener("mousemove", this.#onMouseMove.bind(this));
		doc.addEventListener("pointerdown", this.#onPointerDown.bind(this));
		doc.addEventListener(
			"selectionchange",
			debounce(async () => {
				if (!this.view) return;
				this.iframe =
					this.view.renderer.getContents()[0]?.doc.defaultView?.frameElement ??
					null;

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
	}

	#onPointerDown(event: PointerEvent) {
		window.document.dispatchEvent(
			new MouseEvent("pointerdown", {
				bubbles: true,
				cancelable: true,
				screenX: event.screenX,
				screenY: event.screenY,
			}),
		);
	}
	#onMouseMove(event: MouseEvent) {
		if (!this.iframe) return;
		// TODO: Should use the rects of #container element
		const iframeRect = this.iframe.getBoundingClientRect();
		const clientX = event.clientX + iframeRect.left;
		const clientY = event.clientY + iframeRect.top;
		const mouseEvent = new MouseEvent("mousemove", {
			bubbles: true,
			cancelable: true,
			clientX,
			clientY,
		});
		window.dispatchEvent(mouseEvent);
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
