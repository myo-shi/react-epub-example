import Epub, { type Book, type Rendition, type Contents } from "epubjs";
import type Section from "epubjs/types/section";
import { proxy, ref, useSnapshot } from "valtio";

type Toc = { label: string; href: string }[];

class Reader {
  book?: Book;
  iframeWindow?: Window;
  rendition?: Rendition;
  toc?: Toc;
  progress?: number;
  displayed = false;

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

function makeCssRuleImportant(cssStr?: string) {
  return cssStr ? `${cssStr} !important` : cssStr;
}

const reader = proxy(new Reader());

const actions = {
  openBook: async (file: File) => {
    const ab = await file.arrayBuffer();
    reader.book = ref(Epub(ab));
    reader.book.ready.then(() => {
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
        color: makeCssRuleImportant("#dde4e3"),
        background: makeCssRuleImportant("transparent"),
      },
    });
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
      const progress = reader.book?.locations.percentageFromCfi(
        locations.start.cfi
      );
      console.log(progress);
    });
    reader.rendition.on("removed", () => {
      console.log("removed");
    });
    reader.rendition.on("markClicked", () => {
      console.log("markClicked");
    });
  },

  close: () => {
    reader.rendition?.destroy();
    reader.book?.destroy();
    reader.displayed = false;
    reader.book = undefined;
    reader.iframeWindow = undefined;
    reader.rendition = undefined;
    reader.toc = undefined;
  },
};

const useReaderSnapshot = () => {
  return useSnapshot(reader);
};

export { actions as readerActions, useReaderSnapshot };
