import { forwardRef } from "react";
import type { DeepReadonly } from "ts-essentials";
import type { Toc } from "../reader";
import { TocTree } from "./toc-tree";

type SidebarProps = {
	toc: DeepReadonly<Toc>;
	onSelect: () => void;
};

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
	({ toc, onSelect }, ref) => {
		return (
			<aside ref={ref} className="h-screen">
				<TocTree onSelect={onSelect} className="h-full" toc={toc} />
			</aside>
		);
	},
);
