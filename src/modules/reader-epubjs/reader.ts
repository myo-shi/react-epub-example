import Epub, {
  type Book,
  type Rendition,
  type Contents,
  type NavItem,
  type Location,
  EpubCFI,
} from "epubjs";
import type Section from "epubjs/types/section";
import { proxy, ref, useSnapshot } from "valtio";
import themes from "./theme.css?url";

export type Toc = NavItem[];

type ReaderState = {
  book: Book | null;
  iframeWindow: Window | null;
  rendition: Rendition | null;
  toc: Toc | null;
  progress: number | null;
  chapter: NavItem | null;
  displayed: boolean;
  isOpeningBook: boolean;
};

type ReaderStateKey = keyof ReaderState;

const initialState: ReaderState = {
  book: null,
  iframeWindow: null,
  rendition: null,
  toc: null,
  progress: null,
  chapter: null,
  displayed: false,
  isOpeningBook: false,
};

// https://valtio.dev/docs/how-tos/how-to-reset-state
const resetObj = Object.assign({}, initialState);

const reader = proxy(initialState);

// function makeCssRuleImportant(cssStr?: string) {
//   return cssStr ? `${cssStr} !important` : cssStr;
// }

const keyListener = (event: KeyboardEvent) => {
  if (event.key === "ArrowLeft") {
    reader.rendition?.prev();
  }
  if (event.key === "ArrowRight") {
    reader.rendition?.next();
  }
};

const flattenNavItems = (navItems: NavItem[]): NavItem[] => {
  return navItems.reduce<NavItem[]>((acc, cur) => {
    return acc.concat(cur, flattenNavItems(cur.subitems ?? []));
  }, []);
};

const getCfiFromHref = (book: Book, href: string) => {
  const [_, id] = href.split("#");
  const section = book.spine.get(href);
  const el = (
    id ? section.document.getElementById(id) : section.document.body
  ) as Element;
  return section.cfiFromElement(el);
};

const getChapter = (book: Book, location: Location) => {
  const locationHref = location.start.href;

  const match = flattenNavItems(book.navigation.toc)
    .filter((chapter: NavItem) => {
      return book
        .canonical(chapter.href)
        .includes(book.canonical(locationHref));
    }, null)
    .reduce((result: NavItem | null, chapter: NavItem) => {
      const locationAfterChapter =
        EpubCFI.prototype.compare(
          location.start.cfi,
          getCfiFromHref(book, chapter.href)
        ) > 0;
      return locationAfterChapter ? chapter : result;
    }, null);

  return match;
};

const actions = {
  openBook: async (file: File) => {
    // Prevent multiple rendering at once
    if (reader.isOpeningBook) return;
    reader.isOpeningBook = true;

    const ab = await file.arrayBuffer();
    reader.book = ref(Epub(ab));
    await reader.book.ready;
    reader.isOpeningBook = false;
    reader.book?.locations.generate(1600);
    reader.book.loaded.navigation.then((nav) => {
      reader.toc = ref(nav.toc);
    });
    return;
  },

  render: (targetEl: Element) => {
    if (!reader.book) {
      throw new Error("Open book first");
    }
    console.log("start rendering");

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
      body: {},
    });

    reader.rendition.themes.register("dark", themes);
    reader.rendition.themes.register("gray", themes);
    reader.rendition.themes.register("light", themes);
    reader.rendition.themes.select("gray");

    // https://github.com/futurepress/epub.js/issues/1257
    reader.rendition.hooks.content.register(
      (contents: Contents, rendition: Rendition) => {
        const isCJK = ["ja", "ko", "zh-CN", "zh-TW"].some(
          (c) => c === reader.book?.packaging.metadata.language
        ); //TODO: check lang codes
        if (
          isCJK &&
          (reader.book?.packaging.metadata as any).direction === "rtl"
        ) {
          contents.document.body.style.direction = "ltr";
          (rendition as any).manager.layout.format(contents);
        }
        (rendition as any).manager.layout.format(contents);
      }
    );

    reader.rendition.display().then(() => {
      console.log("displayed");
      reader.displayed = true;
    });

    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    reader.rendition.on("rendered", (section: Section, view: any) => {
      console.log("rendered", section);
      reader.iframeWindow = ref(view.window);
    });
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    reader.rendition.on("selected", (cfiRange: any, contents: Contents) => {
      console.log("selected", cfiRange, contents);
      // reader.rendition?.annotations.highlight(
      //   cfiRange,
      //   {},
      //   (event: MouseEvent) => {
      //     console.log("highlight clicked", event.target);
      //   }
      // );
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
    reader.rendition.on("relocated", (location: Location) => {
      console.log("relocated", location);
      if (!reader.book) {
        return;
      }
      reader.progress = reader.book?.locations.percentageFromCfi(
        location.start.cfi
      );
      reader.chapter = getChapter(reader.book, location);
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
    // https://github.com/microsoft/TypeScript/pull/30769#issuecomment-503643456
    const setValue = <T extends object, K extends keyof T>(
      o1: T,
      o2: T,
      key: K
    ) => {
      o1[key] = o2[key];
    };
    const keys = Object.keys(resetObj) as ReaderStateKey[];
    for (const key of keys) {
      setValue(reader, resetObj, key);
    }
    document.removeEventListener("keyup", keyListener);
  },

  refresh: () => {},

  jumpTo: (href: string) => {
    reader.rendition?.display(href);
  },

  goNext: () => {
    if ((reader.book?.packaging.metadata as any).direction === "rtl") {
      reader.rendition?.prev();
    } else {
      reader.rendition?.next();
    }
  },

  goPrev: () => {
    if ((reader.book?.packaging.metadata as any).direction === "rtl") {
      reader.rendition?.next();
    } else {
      reader.rendition?.prev();
    }
  },
};

const useReaderSnapshot = () => {
  return useSnapshot(reader);
};

export { actions as readerActions, useReaderSnapshot };
