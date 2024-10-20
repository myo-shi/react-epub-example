import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { CFI } from "@/lib/foliate-js/epubcfi";
import type { View } from "@/lib/foliate-js/view";
import {
	HamburgerMenuIcon,
	TrashIcon,
	UnderlineIcon,
} from "@radix-ui/react-icons";
import { PopoverArrow, PopoverPortal } from "@radix-ui/react-popover";
import { useEffect, useRef, useState } from "react";
import { useTransition as useTransitionState } from "react-transition-state";
import { CircleIcon } from "./components/circle-icon";
import { Sidebar } from "./components/sidebar";
import { Reader, getPosition } from "./reader";
// import styles from "./styles.module.css";

const reader = new Reader();

type AnnotationState = {
	cfi: CFI;
	position: { point: { x: number; y: number }; dir: "up" | "down" };
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
	const [opened, setOpened] = useState(false);
	const { theme, setTheme } = useTheme();

	useEffect(() => {
		const open = async () => {
			const view = await reader.open(bookFile, viewerRef.current);
			view?.addEventListener("load", () => {
				setOpened(true);
			});
			view?.addEventListener("text-selected", ({ detail }) => {
				const range = detail.selection.getRangeAt(0);
				const pos = getPosition(range);
				setAnnotation({
					cfi: detail.cfi,
					position: {
						point: {
							...pos.point,
						},
						dir: pos.dir ?? "down",
					},
				});
			});
			view?.addEventListener("show-annotation", ({ detail }) => {
				const pos = getPosition(detail.range);
				setAnnotation({
					cfi: detail.value,
					position: {
						point: {
							...pos.point,
						},
						dir: pos.dir ?? "down",
					},
					hasAnnotation: true,
				});
			});
		};
		open();
		return () => {
			setOpened(false);
			viewerRef.current.close();
		};
	}, [bookFile]);

	useEffect(() => {
		if (!reader.view || !opened) return;
		reader.setAppearance(theme);
	}, [theme, opened]);

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
					<Header onCloseClick={() => {}} />
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
						left: annotation?.position.point.x,
						top: annotation?.position.point.y,
					}}
				/>
				<PopoverPortal>
					<PopoverContent
						side={annotation?.position.dir === "up" ? "top" : "bottom"}
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

type HeaderProps = {
	onCloseClick: () => void;
};

export function Header({ onCloseClick }: HeaderProps) {
	const [{ status, isMounted }, toggle] = useTransitionState({
		timeout: 300,
		mountOnEnter: true,
		unmountOnExit: true,
		preEnter: true,
	});
	const [isSheetOpen, setIsSheetOpen] = useState(false);
	const { theme, setTheme } = useTheme();

	return (
		<div id="header" className={"relative h-12 w-full"}>
			<div
				className="flex h-full items-center justify-center"
				onMouseEnter={() => toggle(true)}
			/>
			<div
				onMouseLeave={() => toggle(false)}
				className={`absolute top-0 bottom-0 left-0 w-full transition duration-300${
					status === "preEnter" || status === "exiting"
						? " transform opacity-0"
						: ""
				}`}
			>
				<Sheet open={isSheetOpen} onOpenChange={(open) => setIsSheetOpen(open)}>
					<div
						className={"flex h-full w-full items-center justify-between gap-3"}
					>
						<SheetTrigger asChild>
							<Button variant={"ghost"}>
								<HamburgerMenuIcon />
							</Button>
						</SheetTrigger>

						{/* <Button type="button" onClick={onCloseClick}>
							Close
						</Button> */}

						<Select onValueChange={setTheme} value={theme}>
							<SelectTrigger className="w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="light">Light</SelectItem>
								<SelectItem value="dark">Dark</SelectItem>
								<SelectItem value="cupcake">Cupcake</SelectItem>
								<SelectItem value="retro">Retro</SelectItem>
								<SelectItem value="dim">Dim</SelectItem>
								<SelectItem value="coffee">Coffee</SelectItem>
							</SelectContent>
						</Select>

						<SheetContent side="left" className="">
							{/* <Sidebar
									toc={toc ?? []}
									onSelect={() => setIsSheetOpen(false)}
								/> */}
						</SheetContent>
					</div>
				</Sheet>
			</div>
		</div>
	);
}
