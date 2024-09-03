import { useEffect, useRef, useState } from "react";
import { readerActions, useReaderSnapshot } from "./reader";

import "./App.css";
import throttle from "lodash.throttle";

function App() {
  const [bookFile, setBookFile] = useState<File | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const readerSnap = useReaderSnapshot();

  const openBookFile = async () => {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    setBookFile(file);
  };

  useEffect(() => {
    if (!bookFile) return;
    readerActions.openBook(bookFile);
  }, [bookFile]);

  useEffect(() => {
    if (!readerSnap.book || !viewerRef.current || readerSnap.displayed) return;
    readerActions.render(viewerRef.current);
    () => {
      readerActions.close();
    };
  }, [readerSnap.book, readerSnap.displayed]);

  useEffect(() => {
    const onWheel = throttle((event: WheelEvent) => {
      event.preventDefault();
      const deltaY = Math.sign(event.deltaY);
      const deltaX = Math.sign(event.deltaX);
      if (deltaY > 0 || deltaX > 0) {
        readerSnap.goNext();
      } else {
        readerSnap.goPrev();
      }
    }, 50);
    readerSnap.iframeWindow?.addEventListener("wheel", onWheel, {});
    // While re-rendering, the wheel event is captured by the parent window because there is no iframe window.
    window.document.addEventListener("wheel", onWheel);

    return () => {
      readerSnap.iframeWindow?.removeEventListener("wheel", onWheel);
      window.document.removeEventListener("wheel", onWheel);
    };
  }, [readerSnap.iframeWindow, readerSnap.goNext, readerSnap.goPrev]);

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div>
        <button type="button" onClick={openBookFile}>
          Open Book
        </button>
        <select
          onChange={(event) => {
            readerSnap.jumpTo(event.target.value);
          }}
        >
          {readerSnap.toc?.map((i) => (
            <option key={i.label} value={i.href}>
              {i.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => readerActions.close()}>
          Close
        </button>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          minHeight: "100px",
          width: "100%",
          // `color-scheme: dark` will make iframe background white
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            style={{ height: "200px" }}
            onClick={() => readerSnap.goPrev()}
          >
            &#60;
          </button>
        </div>
        <div
          ref={viewerRef}
          id="viewer"
          style={{
            flex: 1,
            width: "100%",
            overflow: "hidden",
            colorScheme: "auto",
          }}
        />
        <div style={{ display: "flex", alignItems: "center" }}>
          <button
            type="button"
            style={{ height: "200px" }}
            onClick={() => readerSnap.goNext()}
          >
            &#62;
          </button>
        </div>
      </div>
      <div
        id="footer"
        style={{
          display: "flex",
          justifyContent: "space-between",
          width: "100%",
        }}
      />
    </div>
  );
}

export default App;
