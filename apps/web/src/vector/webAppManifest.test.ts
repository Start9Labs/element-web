/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://chat.example.org/app/"}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SdkConfig from "../SdkConfig";
import { applyWebAppManifest } from "./webAppManifest";

const query = <T extends Element>(selector: string): T[] => Array.from(document.querySelectorAll<T>(selector));

async function servedManifest(): Promise<Record<string, unknown>> {
    const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
    return JSON.parse(await blob.text());
}

describe("applyWebAppManifest", () => {
    beforeEach(() => {
        document.head.innerHTML = `
            <link rel="apple-touch-icon" sizes="180x180" href="/vector-icons/180.png">
            <link rel="manifest" href="manifest.json">
            <link rel="icon" type="image/png" sizes="24x24" href="/vector-icons/24.png">
            <meta name="apple-mobile-web-app-title" content="Element">
            <meta name="application-name" content="Element">
        `;
        vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:manifest");
    });

    afterEach(() => {
        SdkConfig.reset();
        vi.restoreAllMocks();
    });

    it("leaves the page alone without web_app_manifest", () => {
        applyWebAppManifest();
        expect(URL.createObjectURL).not.toHaveBeenCalled();
        expect(query<HTMLLinkElement>('link[rel="manifest"]')[0].getAttribute("href")).toBe("manifest.json");
        expect(query<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')[0].content).toBe("Element");
    });

    it("serves the built-in manifest with the deployment's name and icons", async () => {
        SdkConfig.put({
            web_app_manifest: {
                name: "Support",
                icons: [{ src: "icons/512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }],
                background_color: "#f0f0f0",
            },
        });
        applyWebAppManifest();
        expect(query<HTMLLinkElement>('link[rel="manifest"]')[0].href).toBe("blob:manifest");
        expect(await servedManifest()).toEqual(
            expect.objectContaining({
                name: "Support",
                short_name: "Support",
                display: "standalone",
                start_url: "https://chat.example.org/app/index.html",
                background_color: "#f0f0f0",
                icons: [
                    {
                        src: "https://chat.example.org/app/icons/512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            }),
        );
    });

    it("points the app title, favicon and touch icons at the deployment's", () => {
        SdkConfig.put({
            web_app_manifest: {
                name: "Support",
                short_name: "S9",
                icons: [{ src: "icons/512.png", sizes: "512x512" }],
            },
        });
        applyWebAppManifest();
        expect(query<HTMLMetaElement>('meta[name="application-name"]')[0].content).toBe("Support");
        expect(query<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]')[0].content).toBe("S9");
        expect(query<HTMLMetaElement>('meta[name="apple-mobile-web-app-capable"]')[0].content).toBe("yes");
        expect(query<HTMLMetaElement>('meta[name="mobile-web-app-capable"]')[0].content).toBe("yes");
        for (const rel of ["icon", "apple-touch-icon"]) {
            expect(
                query<HTMLLinkElement>(`link[rel="${rel}"]`).map((link) => [link.href, link.getAttribute("sizes")]),
            ).toEqual([["https://chat.example.org/app/icons/512.png", "512x512"]]);
        }
    });

    it("keeps upstream's icons when only the name changes", async () => {
        SdkConfig.put({ web_app_manifest: { name: "Support" } });
        applyWebAppManifest();
        expect(query<HTMLLinkElement>('link[rel="apple-touch-icon"]')[0].getAttribute("href")).toBe(
            "/vector-icons/180.png",
        );
        expect((await servedManifest()).icons).toEqual(
            expect.arrayContaining([expect.objectContaining({ src: "https://chat.example.org/vector-icons/512.png" })]),
        );
    });
});
