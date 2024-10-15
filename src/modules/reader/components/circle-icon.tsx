import { forwardRef } from "react";

type CircleIconProps = {
	color?: string;
	title: string;
} & React.SVGAttributes<SVGElement>;

export const CircleIcon = forwardRef<SVGSVGElement, CircleIconProps>(
	({ title, width = 15, height = 15, ...props }, ref) => {
		return (
			<svg
				{...props}
				ref={ref}
				width={width}
				height={height}
				viewBox="0 0 100 100"
				xmlns="http://www.w3.org/2000/svg"
			>
				<circle fill="currentColor" cx="50" cy="50" r="50">
					<title>{title}</title>
				</circle>
			</svg>
		);
	},
);
