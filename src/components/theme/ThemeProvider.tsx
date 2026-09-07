import {
	createContext,
	type ReactNode,
	useContext,
	useLayoutEffect,
	useState,
} from "react";

export type Theme =
	| "ayu-light"
	| "ayu-mirage"
	| "ayu-dark"
	| "catppuccin-latte"
	| "catppuccin-frappe"
	| "catppuccin-macchiato"
	| "catppuccin-mocha"
	| "kanso"
	| "kanagawa"
	| "one-dark-pro";

export const themes = [
	{
		id: "ayu-light",
		label: "Ayu Light",
		preview: {
			background: "#F8F9FA",
			surface: "#FCFCFC",
			accent: "#F29718",
			border: "#828E9F",
			foreground: "#5C6166",
		},
	},
	{
		id: "ayu-mirage",
		label: "Ayu Mirage",
		preview: {
			background: "#1F2430",
			surface: "#242936",
			accent: "#FFCC66",
			border: "#707A8C",
			foreground: "#CCCAC2",
		},
	},
	{
		id: "ayu-dark",
		label: "Ayu Dark",
		preview: {
			background: "#0D1017",
			surface: "#10141C",
			accent: "#E6B450",
			border: "#5A6378",
			foreground: "#BFBDB6",
		},
	},
	{
		id: "catppuccin-latte",
		label: "Catppuccin Latte",
		preview: {
			background: "#eff1f5",
			surface: "#ccd0da",
			accent: "#8839ef",
			border: "#9ca0b0",
			foreground: "#4c4f69",
		},
	},
	{
		id: "catppuccin-frappe",
		label: "Catppuccin Frappé",
		preview: {
			background: "#303446",
			surface: "#414559",
			accent: "#ca9ee6",
			border: "#737994",
			foreground: "#c6d0f5",
		},
	},
	{
		id: "catppuccin-macchiato",
		label: "Catppuccin Macchiato",
		preview: {
			background: "#24273a",
			surface: "#363a4f",
			accent: "#c6a0f6",
			border: "#6e738d",
			foreground: "#cad3f5",
		},
	},
	{
		id: "catppuccin-mocha",
		label: "Catppuccin Mocha",
		preview: {
			background: "#1e1e2e",
			surface: "#313244",
			accent: "#cba6f7",
			border: "#45475a",
			foreground: "#cdd6f4",
		},
	},
	{
		id: "kanso",
		label: "Kanso",
		preview: {
			background: "#14171d",
			surface: "#22262d",
			accent: "#98bb6c",
			border: "#393b44",
			foreground: "#c5c9c7",
		},
	},
	{
		id: "kanagawa",
		label: "Kanagawa",
		preview: {
			background: "#1f1f28",
			surface: "#2a2a37",
			accent: "#7e9cd8",
			border: "#363646",
			foreground: "#dcd7ba",
		},
	},
	{
		id: "one-dark-pro",
		label: "One Dark Pro",
		preview: {
			background: "#282c34",
			surface: "#21252b",
			accent: "#61afef",
			border: "#3e4451",
			foreground: "#abb2bf",
		},
	},
] as const satisfies ReadonlyArray<{
	id: Theme;
	label: string;
	preview: {
		background: string;
		surface: string;
		accent: string;
		border: string;
		foreground: string;
	};
}>;

type ThemeContextValue = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "tempo-theme";

function getInitialTheme(): Theme {
	const storedTheme = window.localStorage.getItem(STORAGE_KEY);
	if (storedTheme === "light" || storedTheme === "dark") {
		window.localStorage.setItem(STORAGE_KEY, "catppuccin-mocha");
		return "catppuccin-mocha";
	}
	if (storedTheme === "catppuccin") {
		window.localStorage.setItem(STORAGE_KEY, "catppuccin-mocha");
		return "catppuccin-mocha";
	}
	if (themes.some(({ id }) => id === storedTheme)) return storedTheme as Theme;
	return "catppuccin-mocha";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [theme, setTheme] = useState<Theme>(getInitialTheme);

	useLayoutEffect(() => {
		document.documentElement.dataset.theme = theme;
		document.documentElement.classList.toggle("dark", true);
		window.localStorage.setItem(STORAGE_KEY, theme);
	}, [theme]);

	return (
		<ThemeContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used inside ThemeProvider");
	return context;
}
