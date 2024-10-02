import "@/lib/foliate-js/view.js";
import { EPUB } from "../../lib/foliate-js/epub.js";
import {
  BlobReader,
  BlobWriter,
  configure,
  TextWriter,
  ZipReader,
} from "../../lib/foliate-js/vendor/zip.js";
import type { View } from "@/lib/foliate-js/view";
import { Overlayer } from "@/lib/foliate-js/overlayer";
import debounce from "lodash.debounce";

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
  const book = await new EPUB(loader as any).init();
  if (!book) throw new Error("File type not supported");
  console.log("load book", book, elm);

  await elm.open(book);
  return elm;
};

export class Reader {
  view: View | null = null;
  isOpening = false;
  selectedText: string | null = null;

  async open(file: File, ref: React.RefObject<View>) {
    if (this.isOpening || !ref.current) return;

    this.isOpening = true;
    this.view = await getView(file, ref.current);
    this.view.addEventListener("load", this.#onLoad.bind(this));
    // this.view.addEventListener("relocate", this.#onRelocate.bind(this));

    const { book } = this.view;
    // this.view.renderer.setStyles?.(getCSS(this.style));
    this.view.renderer?.next();

    document.addEventListener("select", (ev) => {
      console.log(ev);
    });
    this.view.addEventListener('draw-annotation', e => {
      const { draw, annotation } = e.detail
      const { color } = annotation
      draw(Overlayer.highlight, { color })
    })
  }

  #handleKeydown(event: KeyboardEvent) {
    const k = event.key;
    if (k === "ArrowLeft" || k === "h") this.view?.goLeft();
    else if (k === "ArrowRight" || k === "l") this.view?.goRight();
  }
  #onLoad({ detail }: any) {
    const doc = detail.doc as Document;
    doc.addEventListener("keydown", this.#handleKeydown.bind(this));
    doc.addEventListener("selectionchange", debounce(async () => {
      console.log("select", doc.getSelection());
      this.selectedText = doc.getSelection()?.toString() ?? null;
      const cfi = this.view?.getCFI(detail.index, doc.getSelection()?.getRangeAt(0))
      console.log('cfi', cfi, detail.index);
      this.view?.addAnnotation({ value: cfi })

      const iframe = document.getElementsByTagName("iframe").item(0);
      console.log(iframe);

      const old = window.document.getElementById("selected");
      if (old) {
        window.document.body.removeChild(old);
      }
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selection.removeAllRanges();
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
          selection?.addRange(range);
          console.log("range", range);
        }, 100);
      }
    }, 500));
    doc.addEventListener("mousemove", (event) => {
      const innerScreenX = window.screenX;
      const innerScreenY =
        window.outerHeight - window.innerHeight + window.screenY;
      const mouseEvent = new MouseEvent("mousemove", {
        bubbles: true,
        cancelable: true,
        clientX: event.screenX - innerScreenX,
        clientY: event.screenY - innerScreenY,
      });
      window.dispatchEvent(mouseEvent);
    });
  }
  // #onRelocate({ detail }: any) {
  // 	const { fraction, location, tocItem, pageItem } = detail;
  // 	const percent = percentFormat.format(fraction);
  // 	const loc = pageItem ? `Page ${pageItem.label}` : `Loc ${location.current}`;
  // 	const slider = $("#progress-slider");
  // 	slider.style.visibility = "visible";
  // 	slider.value = fraction;
  // 	slider.title = `${percent} · ${loc}`;
  // 	if (tocItem?.href) this.#tocView?.setCurrentHref?.(tocItem.href);
  // }
}
