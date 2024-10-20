import "@/lib/foliate-js/view";
import type { Theme } from "@/components/theme-provider";
import { Overlayer } from "@/lib/foliate-js/overlayer";
import type { View } from "@/lib/foliate-js/view";
import daisyuiThemes from "daisyui/src/theming/themes";
import debounce from "lodash.debounce";
import { getCSS } from "./utils";

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

	setAppearance(themeName: Theme) {
		const daisyuiTheme = daisyuiThemes[themeName];
		const theme = {
			fg: daisyuiTheme["base-content"],
			bg: daisyuiTheme["base-100"],
			link: daisyuiTheme.info,
			isDark: ["dark", "dim", "coffee"].some((c) => c === themeName),
		};
		const renderer = this.view?.renderer;
		if (renderer) {
			// 		renderer.setAttribute('flow', layout.flow)
			// 		renderer.setAttribute('gap', layout.gap * 100 + '%')
			// 		renderer.setAttribute('max-inline-size', layout.maxInlineSize + 'px')
			// 		renderer.setAttribute('max-block-size', layout.maxBlockSize + 'px')
			// 		renderer.setAttribute('max-column-count', layout.maxColumnCount)
			// 		if (layout.animated) renderer.setAttribute('animated', '')
			// 		else renderer.removeAttribute('animated')
			renderer.setStyles?.(getCSS({ ...this.style, theme }));
		}
		// document.body.classList.toggle('invert', this.style.invert)
		// if (autohideCursor) this.view?.setAttribute('autohide-cursor', '')
		// else this.view?.removeAttribute('autohide-cursor')
	}

	async open(file: File, elm: View) {
		if (this.isOpening) return;

		this.isOpening = true;
		this.view = elm;
		await this.view.open(file);
		this.view.addEventListener("load", this.#onLoad.bind(this));
		this.view.addEventListener("relocate", this.#onRelocate.bind(this));

		const { book } = this.view;
		console.log("toc", book.toc);
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
