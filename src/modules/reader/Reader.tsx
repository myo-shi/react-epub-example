import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import type { CFI } from "@/lib/foliate-js/epubcfi";
import type { View } from "@/lib/foliate-js/view";
import { TrashIcon, UnderlineIcon } from "@radix-ui/react-icons";
import { PopoverArrow, PopoverPortal } from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { useTransition as useTransitionState } from "react-transition-state";
import { CircleIcon } from "./components/circle-icon";
import { Reader } from "./reader";
// import styles from "./styles.module.css";

const reader = new Reader();

type AnnotationRect = {
	top: number;
	left: number;
	height: number;
	width: number;
};

type AnnotationState = {
	cfi: CFI;
	position: AnnotationRect;
	memo?: string;
	hasAnnotation?: boolean;
};

type ReaderProps = {
	bookFile: File;
	onClose: () => void;
};

export function ReaderComp({ bookFile }: ReaderProps) {
	const viewerRef = useRef<View>(
		document.getElementById("foliate-view") as unknown as View,
	);
	const [annotation, setAnnotation] = useState<AnnotationState | null>(null);

	useEffect(() => {
		const open = async () => {
			const view = await reader.open(bookFile, viewerRef.current);
			view?.addEventListener("text-selected", ({ detail }) => {
				const range = detail.selection.getRangeAt(0);
				const rects = range.getBoundingClientRect();
				const container: Element = view.renderer.container;
				const containerRects = container.getBoundingClientRect();
				const left = containerRects.left + rects.left;
				const top = containerRects.top + rects.top;
				setAnnotation({
					cfi: detail.cfi,
					position: {
						left,
						top,
						height: rects.height,
						width: rects.width,
					},
				});
			});
			view?.addEventListener("show-annotation", ({ detail }) => {
				const range = detail.range;
				const rects = range.getBoundingClientRect();
				const container: Element = view.renderer.container;
				const containerRects = container.getBoundingClientRect();
				const left = containerRects.left + rects.left;
				const top = containerRects.top + rects.top;
				setAnnotation({
					cfi: detail.value,
					position: {
						left,
						top,
						height: rects.height,
						width: rects.width,
					},
					hasAnnotation: true,
				});
			});
		};
		open();
		return () => {
			viewerRef.current.close();
		};
	}, [bookFile]);

	const handleAnnotationColorClick = (color: string) => {
		if (!annotation) return;
		viewerRef.current.addAnnotation({ color, value: annotation.cfi });
	};

	const deleteAnnotation = () => {
		if (!annotation) return;
		viewerRef.current.deleteAnnotation({ value: annotation.cfi });
	};

	return (
		<>
			<div className={"flex h-full w-full overflow-hidden"}>
				<div className="flex h-full w-full flex-1 flex-col">
					<div
						style={{
							flex: 1,
							display: "flex",
							minHeight: "100px",
							width: "100%",
							overflow: "hidden",
						}}
					>
						<foliate-view
							ref={viewerRef}
							id="foliate-view"
							style={{ width: "100%", flex: 1 }}
						/>
					</div>
					<div id="footer" className="flex w-full justify-between" />
				</div>
			</div>
			<Popover open={annotation !== null}>
				<PopoverAnchor
					style={{
						userSelect: "none",
						pointerEvents: "none",
						position: "fixed",
						left: annotation?.position.left,
						top: annotation?.position.top,
						height: annotation?.position.height,
						width: annotation?.position.width,
					}}
				/>
				<PopoverPortal>
					<PopoverContent
						onPointerDownOutside={() => {
							setAnnotation(null);
						}}
						className="w-fit"
					>
						<div className="flex items-center">
							<Button
								onClick={() => handleAnnotationColorClick("red")}
								variant="ghost"
								size="icon"
							>
								<CircleIcon title="red" style={{ color: "red" }} />
							</Button>
							<Button variant="ghost" size="icon">
								<CircleIcon title="blue" style={{ color: "blue" }} />
							</Button>
							<Button variant="ghost" size="icon">
								<CircleIcon title="green" style={{ color: "green" }} />
							</Button>
							<Button variant="ghost" size="icon">
								<CircleIcon title="yellow" style={{ color: "yellow" }} />
							</Button>
							<Button variant="ghost" size="icon">
								<UnderlineIcon height={20} width={20} />
							</Button>

							{annotation?.hasAnnotation && (
								<Button onClick={deleteAnnotation} variant="ghost" size="icon">
									<TrashIcon height={20} width={20} />
								</Button>
							)}
						</div>
						<PopoverArrow />
					</PopoverContent>
				</PopoverPortal>
			</Popover>
		</>
	);
}

// type HeaderProps = {
//   onCloseClick: () => void;
// };

// export function Header({ onCloseClick }: HeaderProps) {
//   const [{ status, isMounted }, toggle] = useTransitionState({
//     timeout: 300,
//     mountOnEnter: true,
//     unmountOnExit: true,
//     preEnter: true,
//   });
//   const [isSheetOpen, setIsSheetOpen] = useState(false);
//   const { toc, chapter } = useReaderSnapshot();

//   return (
//     <div id="header" className={"relative h-12 w-full"}>
//       <div
//         className="flex h-full items-center justify-center"
//         onMouseEnter={() => toggle(true)}
//       >
//         {chapter?.label}
//       </div>

//       {isMounted && (
//         <div
//           onMouseLeave={() => toggle(false)}
//           className={`absolute top-0 bottom-0 left-0 w-full bg-zinc-900 transition duration-300${
//             status === "preEnter" || status === "exiting"
//               ? " transform opacity-0"
//               : ""
//           }`}
//         >
//           <Sheet
//             open={isSheetOpen}
//             onOpenChange={(open) => setIsSheetOpen(open)}
//           >
//             <div
//               className={
//                 "flex h-full w-full items-center justify-between gap-3"
//               }
//             >
//               <SheetTrigger asChild>
//                 <Button variant={"ghost"}>
//                   <HamburgerMenuIcon />
//                 </Button>
//               </SheetTrigger>

//               <Button type="button" onClick={onCloseClick}>
//                 Close
//               </Button>
//               <SheetContent side="left" className="bg-zinc-950">
//                 <Sidebar
//                   toc={toc ?? []}
//                   onSelect={() => setIsSheetOpen(false)}
//                 />
//               </SheetContent>
//             </div>
//           </Sheet>
//         </div>
//       )}
//     </div>
//   );
// }
