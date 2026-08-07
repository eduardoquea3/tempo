import en from "@/locales/en.json";
import es from "@/locales/es.json";

const translations = { es, en } as const;
export type Locale = keyof typeof translations;
export type TranslationKey = keyof typeof es;

let locale: Locale = "es";

export function setLocale(nextLocale: Locale) {
	locale = nextLocale;
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
