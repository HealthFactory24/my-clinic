import appConfig from "@/config/app.config";

import { env } from "../env/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoMeta {
	content: string;
	name?: string;
	property?: string;
}

interface SeoLink {
	href: string;
	hreflang?: string;
	rel: string;
	type?: string;
}

interface SeoResult {
	links?: Array<SeoLink>;
	meta?: Array<SeoMeta>;
}

interface AppSeoOptions {
	description?: string;
	includeDocumentMeta?: boolean;
	noIndex?: boolean;
	title?: string;
}

// ─── Implementation ───────────────────────────────────────────────────────────

export function generateAppSeo({
	title,
	description,
	noIndex = false,
	includeDocumentMeta = false
}: AppSeoOptions = {}): SeoResult {
	const resolvedTitle = title
		? `${title} | ${appConfig.site.shortName}`
		: appConfig.site.longName;

	const resolvedDescription = description ?? appConfig.site.description;

	const meta: Array<SeoMeta> = [
		{ name: "robots", content: noIndex ? "noindex,nofollow" : "index,follow" },
		{ property: "og:site_name", content: appConfig.site.longName },
		{ property: "og:title", content: resolvedTitle },
		{ property: "og:description", content: resolvedDescription },
		{ property: "og:type", content: "website" }
	];

	if (includeDocumentMeta) {
		meta.push(
			{ name: "application-name", content: appConfig.site.longName },
			{ name: "author", content: appConfig.site.author }
		);
	}

	return { links: [], meta };
}

const publicUrl = env.VITE_BASE_URL.replace(/\/$/, "");

export const siteMetadata = {
	description:
		"Advanced clinical management system for pediatric practice, neonatology consultations, and specialized infant care in Hurghada.",
	name: "Smart Clinic - Pediatric & Neonatology Practice",
	shortName: "Smart Clinic",
	url: publicUrl
} as const;

export const getCanonicalUrl = (path = "/") => {
	return new URL(path, siteMetadata.url).toString();
};

export const getSeoMeta = ({
	description = siteMetadata.description,
	path = "/",
	title = siteMetadata.shortName
}: {
	description?: string;
	path?: string;
	title?: string;
} = {}) => {
	const url = getCanonicalUrl(path);

	return [
		{ title: `${title} | Pediatric & Neonatology Clinic` },
		{ name: "description", content: description },
		{ property: "og:title", content: title },
		{ property: "og:description", content: description },
		{ property: "og:type", content: "website" },
		{ property: "og:url", content: url },
		{ property: "og:site_name", content: siteMetadata.name },
		{ property: "og:locale", content: "en_US" },
		{ name: "twitter:card", content: "summary" },
		{ name: "twitter:title", content: title },
		{ name: "twitter:description", content: description }
	];
};
