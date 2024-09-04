import Epub, { type Book, type Rendition, type Contents } from "epubjs";
import type Section from "epubjs/types/section";
import { proxy, ref, useSnapshot } from "valtio";
import themes from "./theme.css?url";

type Toc = { label: string; href: string }[];

class Reader {
  book?: Book;
  iframeWindow?: Window;
  rendition?: Rendition;
  toc?: Toc;
  progress?: number;
  displayed = false;
  isOpeningBook = false;

  goNext() {
    this.rendition?.next();
  }

  goPrev() {
    this.rendition?.prev();
  }

  jumpTo(target: string) {
    this.rendition?.display(target);
  }
}

// function makeCssRuleImportant(cssStr?: string) {
//   return cssStr ? `${cssStr} !important` : cssStr;
// }

const reader = proxy(new Reader());

const keyListener = (event: KeyboardEvent) => {
  if (event.key === "ArrowLeft") {
    reader.rendition?.prev();
  }
  if (event.key === "ArrowRight") {
    reader.rendition?.next();
  }
};

const actions = {
  openBook: async (file: File) => {
    // Prevent multiple rendering at once
    if (reader.isOpeningBook) return;
    reader.isOpeningBook = true;

    const ab = await file.arrayBuffer();
    reader.book = ref(Epub(ab));
    reader.book.ready.then(() => {
      reader.isOpeningBook = false;
      return reader.book?.locations.generate(1600);
    });
    reader.book.loaded.navigation.then((nav) => {
      const toc: Toc = [];
      // biome-ignore lint/complexity/noForEach: <explanation>
      nav.forEach((chap) => {
        toc.push({ label: chap.label, href: chap.href });
        return {};
      });
      reader.toc = ref(toc);
    });
  },

  render: (targetEl: Element) => {
    if (!reader.book) {
      throw new Error("Open book first");
    }
    console.log("render");

    reader.rendition = ref(
      reader.book.renderTo(targetEl, {
        height: "100%",
        width: "100%",
        allowScriptedContent: true,
      })
    );

    reader.rendition.themes.default({
      html: {
        padding: "0 !important",
      },
    });

    reader.rendition.themes.register("dark", themes);
    reader.rendition.themes.register("gray", themes);
    reader.rendition.themes.register("light", themes);
    reader.rendition.themes.select("gray");

    reader.rendition.display().then(() => {
      console.log("displayed");
      reader.displayed = true;
    });

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    reader.rendition.on("rendered", (section: Section, view: any) => {
      console.log("rendered");
      reader.iframeWindow = ref(view.window);
    });
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    reader.rendition.on("selected", (cfiRange: any, contents: Contents) => {
      console.log("selected", cfiRange, contents);
      reader.rendition?.annotations.highlight(cfiRange, {}, (e) => {
        console.log("highlight clicked", e.target);
      });
    });
    reader.rendition.on("started", () => {
      console.log("started");
    });
    reader.rendition.on("displayed", () => {
      console.log("displayed");
    });
    reader.rendition.on("locationChanged", () => {
      console.log("locationChanged");
    });
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    reader.rendition.on("relocated", (locations: any) => {
      console.log("relocated", locations.start.cfi);
      reader.progress = reader.book?.locations.percentageFromCfi(
        locations.start.cfi
      );
    });
    reader.rendition.on("removed", () => {
      console.log("removed");
    });
    reader.rendition.on("markClicked", () => {
      console.log("markClicked");
    });

    reader.rendition.on("keyup", keyListener);
    document.addEventListener("keyup", keyListener, false);
  },

  close: () => {
    reader.rendition?.destroy();
    reader.book?.destroy();
    reader.displayed = false;
    reader.book = undefined;
    reader.iframeWindow = undefined;
    reader.rendition = undefined;
    reader.toc = undefined;
    document.removeEventListener("keyup", keyListener);
  },

  refresh: () => {},
};

const useReaderSnapshot = () => {
  return useSnapshot(reader);
};

export { actions as readerActions, useReaderSnapshot };
