import { type ReactNode, useSyncExternalStore } from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";

const translations = { es, en } as const;
export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof es;

const STORAGE_KEY = "tempo-locale";
const listeners = new Set<() => void>();

function loadLocale(): Locale {
	try {
		return localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "es";
	} catch {
		return "es";
	}
}

let locale: Locale = loadLocale();

export function setLocale(nextLocale: Locale) {
	locale = nextLocale;
	try {
		localStorage.setItem(STORAGE_KEY, nextLocale);
	} catch {
		// Storage can be unavailable; the current locale still applies.
	}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useLocale() {
	const currentLocale = useSyncExternalStore(
		subscribe,
		() => locale,
		() => "es",
	);
	return { locale: currentLocale, setLocale };
}

export function LocaleProvider({ children }: { children: ReactNode }) {
	useLocale();
	return children;
}

export function t(
	key: TranslationKey,
	variables: Record<string, string | number> = {},
) {
	const template = translations[locale][key] ?? translations.en[key];
	return template.replace(/\{(\w+)\}/g, (_, variable: string) =>
		String(variables[variable] ?? `{${variable}}`),
	);
}
