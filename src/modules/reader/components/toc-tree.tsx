import { Tree, type TreeDataItem } from "@/components/tree";
import { useCallback, useMemo } from "react";
import type { DeepReadonly } from "ts-essentials";
import { readerActions, type Toc } from "../reader";
import { Button } from "@/components/ui/button";

type TocTreeProps = {
	toc: DeepReadonly<Toc>;
	onSelect: () => void;
	className?: string;
};

export const TocTree: React.FC<TocTreeProps> = ({
	toc,
	onSelect,
	className,
}: TocTreeProps) => {
	const handleClickItem = useCallback(
		(href: string) => {
			readerActions.jumpTo(href);
			onSelect();
		},
		[onSelect],
	);
	const data = useMemo(
		() => convertTocToTreeData(toc, handleClickItem),
		[toc, handleClickItem],
	);
	return <Tree expandAll data={data} className={className} />;
};

const convertTocToTreeData = (
	toc: DeepReadonly<Toc>,
	onClick: (href: string) => void,
): TreeDataItem[] => {
	return toc.map((item) => ({
		id: item.id,
		label: (
			<Button
				className="h-auto p-0"
				variant={"link"}
				onClick={() => onClick(item.href)}
			>
				{item.label}
			</Button>
		),
		children: item.subitems?.map((si) => ({
			id: si.id,
			label: (
				<Button
					className="h-auto p-0"
					variant={"link"}
					onClick={() => onClick(si.href)}
				>
					{si.label}
				</Button>
			),
		})),
	}));
};
