import { Reader } from "./modules/reader";

import "./App.css";
import { useState } from "react";
import { Button } from "./components/ui/button";

export const App = () => {
  const [bookFile, setBookFile] = useState<File | null>(null);
  const openBookFile = async () => {
    const [fileHandle] = await window.showOpenFilePicker();
    const file = await fileHandle.getFile();
    setBookFile(file);
  };

  const handleClose = () => {
    setBookFile(null);
  };

  return bookFile !== null ? (
    <Reader bookFile={bookFile} onClose={handleClose} />
  ) : (
    <div>
      <Button type="button" onClick={openBookFile}>
        Open Book
      </Button>
    </div>
  );
};
