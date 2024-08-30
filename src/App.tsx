import Epub, { type Book, type Contents, type Rendition } from "epubjs";
import { useEffect, useRef, useState } from "react";
import "./App.css";
import type Section from "epubjs/types/section";
import { proxy, ref, useSnapshot } from "valtio";

type Toc = { label: string; href: string }[];

class Reader {
  book?: Book;
  iframeWindow?: Window;
  rendition?: Rendition;
  toc?: Toc;
  progress?: number;

  async openBook(file: File) {
    const ab = await file.arrayBuffer();
    this.book = ref(Epub(ab));
    this.book.ready.then(() => {
      return this.book?.locations.generate(1600);
    });
    this.book.loaded.navigation.then((nav) => {
      const toc: Toc = [];
      // biome-ignore lint/complexity/noForEach: <explanation>
      nav.forEach((chap) => {
        toc.push({ label: chap.label, href: chap.href });
        return {};
      });
      this.toc = ref(toc);
    });
  }

  render(targetEl: Element) {
    if (!this.book) {
      throw new Error("Open book first");
    }
    this.rendition = ref(
      this.book.renderTo(targetEl, {
        height: "100%",
        width: "100%",
        allowScriptedContent: true,
      })
    );
    this.rendition.themes.default({
      html: {
        padding: "0 !important",
      },
      body: {
        background: "transparent !important",
        color: "#dde4e3",
      },
      "a:any-link": {
        color: "#80d4d4 !important",
        "text-decoration": "none !important",
      },
      "*": {
        color: "#dde4e3",
      },
      "p, div, span": {
        // "letter-spacing": `${readerSetting.letterGap}em !important`,
        // "line-height": `${readerSetting.lineHeight} !important`,
        // "margin-top": `${readerSetting.paragraphGap}px !important`,
        // "margin-bottom": `${readerSetting.paragraphGap}px !important`,
        color: this.makeCssRuleImportant("#dde4e3"),
        background: this.makeCssRuleImportant("transparent"),
      },
    });
    const displayed = this.rendition.display();
    displayed.then(() => {
      console.log(displayed);
      console.log("");
    });

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    this.rendition.on("rendered", (section: Section, view: any) => {
      console.log("rendered");
      this.iframeWindow = ref(view.window);
    });
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    this.rendition.on("selected", (cfiRange: any, contents: Contents) => {
      console.log("selected", cfiRange, contents);
    });
    this.rendition.on("started", () => {
      console.log("started");
    });
    this.rendition.on("displayed", () => {
      console.log("displayed");
    });
    this.rendition.on("locationChanged", () => {
      console.log("locationChanged");
    });
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    this.rendition.on("relocated", (locations: any) => {
      console.log("relocated", locations.start.cfi);
      const progress = this.book?.locations.percentageFromCfi(
        locations.start.cfi
      );
      console.log(progress);
    });
    this.rendition.on("removed", () => {
      console.log("removed");
    });
    this.rendition.on("markClicked", () => {
      console.log("markClicked");
    });
  }

  goNext() {
    this.book?.rendition.next();
  }

  goPrev() {
    this.book?.rendition.prev();
  }

  jumpTo(target: string) {
    this.rendition?.display(target);
  }

  private makeCssRuleImportant(cssStr?: string) {
    return cssStr ? `${cssStr} !important` : cssStr;
  }
}

const store = proxy(new Reader());

function App() {
  const [bookFile, setBookFile] = useState<File | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const reader = useSnapshot(store);

  const openBookFile = async () => {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    setBookFile(file);
  };

  useEffect(() => {
    if (!bookFile) return;
    store.openBook(bookFile);
  }, [bookFile]);

  useEffect(() => {
    if (!reader.book || !viewerRef.current) return;
    store.render(viewerRef.current);
  }, [reader.book]);

  useEffect(() => {
    if (!reader.iframeWindow) return;
    const onWheel = (event: WheelEvent) => {
      const deltaY = Math.sign(event.deltaY);
      const deltaX = Math.sign(event.deltaX);
      if (deltaY > 0 || deltaX > 0) {
        reader.goNext();
      } else {
        reader.goPrev();
      }
    };
    reader.iframeWindow.addEventListener("wheel", onWheel);
    return () => {
      reader.iframeWindow?.removeEventListener("wheel", onWheel);
    };
  }, [reader.iframeWindow, reader.goNext, reader.goPrev]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div>
        <button type="button" onClick={openBookFile}>
          Open Book
        </button>
        <select
          onChange={(event) => {
            reader.jumpTo(event.target.value);
          }}
        >
          {reader.toc?.map((i) => (
            <option key={i.label} value={i.href}>
              {i.label}
            </option>
          ))}
        </select>
      </div>
      <div
        ref={viewerRef}
        id="viewer"
        style={{
          flex: 1,
          minHeight: "300px",
          width: "100%",
          // `color-scheme: dark` will make iframe background white
          colorScheme: "auto",
        }}
      />
      <div
        id="footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <button type="button" onClick={() => reader.goPrev()}>
          Prev
        </button>
        <button type="button" onClick={() => reader.goNext()}>
          Next
        </button>
      </div>
    </div>
  );
}

export default App;
