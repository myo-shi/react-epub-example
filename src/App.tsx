import { useState } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { Button } from "./components/ui/button";
import { Reader } from "./modules/reader";

import "./App.css";

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

	return (
		<ThemeProvider defaultTheme="dark" storageKey="ui-theme">
			{bookFile !== null ? (
				<Reader bookFile={bookFile} onClose={handleClose} />
			) : (
				<div>
					<Button type="button" onClick={openBookFile}>
						Open Book
					</Button>
				</div>
			)}
		</ThemeProvider>
	);
};
