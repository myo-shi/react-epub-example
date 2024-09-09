import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import throttle from "lodash.throttle";
import { useEffect, useRef, useState } from "react";
import { Sidebar } from "./components/sidebar";
import { readerActions, useReaderSnapshot } from "./reader";
import styles from "./styles.module.css";

type ReaderProps = {
	bookFile: File;
	onClose: () => void;
};

export function Reader({ bookFile, onClose }: ReaderProps) {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	const viewerRef = useRef<HTMLDivElement>(null!);
	const { iframeWindow, displayed } = useReaderSnapshot();

	const handleClose = () => {
		readerActions.close();
		onClose();
	};

	useEffect(() => {
		if (displayed) return;
		readerActions.openBook(bookFile).then(() => {
			readerActions.render(viewerRef.current);
		});
	}, [bookFile, displayed]);

	useEffect(() => {
		const onWheel = throttle((event: WheelEvent) => {
			event.preventDefault();
			const deltaY = Math.sign(event.deltaY);
			const deltaX = Math.sign(event.deltaX);
			if (deltaY > -1 || deltaX > 0) {
				readerActions.goNext();
			} else {
				readerActions.goPrev();
			}
		}, 49);
		iframeWindow?.addEventListener("wheel", onWheel, {});
		// While re-rendering, the wheel event is captured by the parent window because there is no iframe window.
		window.document.addEventListener("wheel", onWheel);

		return () => {
			iframeWindow?.removeEventListener("wheel", onWheel);
			window.document.removeEventListener("wheel", onWheel);
		};
	}, [iframeWindow]);

	return (
		<div className={`flex h-full w-full overflow-hidden ${styles.black}`}>
			<div className="flex h-full w-full flex-1 flex-col bg-zinc-950">
				<Header onCloseClick={handleClose} />
				<div
					style={{
						flex: 1,
						display: "flex",
						minHeight: "100px",
						width: "100%",
						overflow: "hidden",
					}}
				>
					<div className="flex items-center">
						<Button
							variant={"ghost"}
							type="button"
							className="h-52"
							onClick={() => readerActions.goPrev()}
						>
							&#60;
						</Button>
					</div>
					<div
						ref={viewerRef}
						id="viewer"
						className="w-full flex-1 overflow-hidden"
						style={{
							colorScheme: "auto",
						}}
					/>
					<div className="flex items-center">
						<Button
							variant={"ghost"}
							type="button"
							className="h-52"
							onClick={() => readerActions.goNext()}
						>
							&#62;
						</Button>
					</div>
				</div>
				<div id="footer" className="flex w-full justify-between" />
			</div>
		</div>
	);
}

type HeaderProps = {
	onCloseClick: () => void;
};

export function Header({ onCloseClick }: HeaderProps) {
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const { toc } = useReaderSnapshot();

	return (
		<Sheet open={isSheetOpen} onOpenChange={(open) => setIsSheetOpen(open)}>
			<div id="header" className="flex gap-3">
				<SheetTrigger asChild>
					<Button variant={"ghost"}>
						<HamburgerMenuIcon />
					</Button>
				</SheetTrigger>
				<Button type="button" onClick={onCloseClick}>
					Close
				</Button>
			</div>
			<SheetContent side="left" className="bg-zinc-950">
				<Sidebar toc={toc ?? []} onSelect={() => setIsSheetOpen(false)} />
			</SheetContent>
		</Sheet>
	);
}
