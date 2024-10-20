import type { Theme as DaisyuiTheme } from "daisyui";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = Extract<
	DaisyuiTheme,
	"light" | "dark" | "cupcake" | "retro" | "dim" | "coffee"
>;

type ThemeProviderProps = {
	children: React.ReactNode;
	defaultTheme?: Theme;
	storageKey?: string;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
	theme: "cupcake",
	setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
	children,
	defaultTheme,
	storageKey = "vite-ui-theme",
	...props
}: ThemeProviderProps) {
	const [theme, setTheme] = useState(
		() =>
			(localStorage.getItem(storageKey) as Theme | undefined) || defaultTheme,
	);
	const actualTheme =
		theme == null
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "dark"
				: "light"
			: theme;

	useEffect(() => {
		const root = window.document.documentElement;
		root.removeAttribute("data-theme");
		root.setAttribute("data-theme", actualTheme);
		root.classList.add("dark");
	}, [actualTheme]);

	const value = {
		theme: actualTheme,
		setTheme: (theme: Theme) => {
			localStorage.setItem(storageKey, theme);
			setTheme(theme);
		},
	};

	return (
		<ThemeProviderContext.Provider {...props} value={value}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);

	if (context === undefined)
		throw new Error("useTheme must be used within a ThemeProvider");

	return context;
};
