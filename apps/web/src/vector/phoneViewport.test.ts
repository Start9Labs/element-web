/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fitRootToVisualViewport } from "./phoneViewport";
import UIStore from "../stores/UIStore";

describe("fitRootToVisualViewport", () => {
    const viewport = { height: 800, listeners: {} as Record<string, () => void> };
    let phone = true;

    beforeEach(() => {
        viewport.height = 800;
        phone = true;
        UIStore.instance.windowHeight = 800;
        vi.stubGlobal("visualViewport", {
            get height() {
                return viewport.height;
            },
            addEventListener: (type: string, listener: () => void) => {
                viewport.listeners[type] = listener;
            },
        });
        vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: phone }) as MediaQueryList);
        vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        document.documentElement.style.height = "";
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("shrinks the root to the visual viewport while the keyboard is open, and lets go after", () => {
        fitRootToVisualViewport();
        expect(document.documentElement.style.height).toBe("");
        viewport.height = 420;
        viewport.listeners.resize();
        expect(document.documentElement.style.height).toBe("420px");
        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
        viewport.height = 800;
        viewport.listeners.resize();
        expect(document.documentElement.style.height).toBe("");
    });

    it("leaves the root alone above the phone breakpoint", () => {
        phone = false;
        fitRootToVisualViewport();
        viewport.height = 420;
        viewport.listeners.resize();
        expect(document.documentElement.style.height).toBe("");
    });

    it("does nothing without a visual viewport", () => {
        vi.stubGlobal("visualViewport", undefined);
        expect(() => fitRootToVisualViewport()).not.toThrow();
    });
});
