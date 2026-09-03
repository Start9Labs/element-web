/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import manifest from "../../res/manifest.json";
import SdkConfig from "../SdkConfig";

interface Icon {
    src: string;
    sizes?: string;
    type?: string;
}

function setMeta(name: string, content: string): void {
    let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!meta) meta = document.head.appendChild(Object.assign(document.createElement("meta"), { name }));
    meta.content = content;
}

function setIconLinks(rel: string, icons: Icon[]): void {
    document.querySelectorAll(`link[rel="${rel}"]`).forEach((link) => link.remove());
    for (const icon of icons) {
        const link = document.createElement("link");
        link.rel = rel;
        link.href = icon.src;
        if (icon.sizes) link.setAttribute("sizes", icon.sizes);
        if (icon.type) link.type = icon.type;
        document.head.appendChild(link);
    }
}

export function applyWebAppManifest(): void {
    const overrides = SdkConfig.get("web_app_manifest");
    if (!overrides) return;
    const resolve = (url: string): string => new URL(url, document.baseURI).href;
    const merged = {
        ...manifest,
        ...overrides,
        short_name: overrides.short_name ?? overrides.name ?? manifest.short_name,
        start_url: resolve(manifest.start_url),
        icons: (overrides.icons ?? manifest.icons).map((icon) => ({ ...icon, src: resolve(icon.src) })),
    };
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) link = document.head.appendChild(Object.assign(document.createElement("link"), { rel: "manifest" }));
    link.href = URL.createObjectURL(new Blob([JSON.stringify(merged)], { type: "application/manifest+json" }));
    setMeta("application-name", merged.name);
    setMeta("apple-mobile-web-app-title", merged.short_name);
    if (merged.display !== "browser") {
        setMeta("mobile-web-app-capable", "yes");
        setMeta("apple-mobile-web-app-capable", "yes");
    }
    if (overrides.icons) {
        setIconLinks("icon", merged.icons);
        setIconLinks("apple-touch-icon", merged.icons);
    }
}
