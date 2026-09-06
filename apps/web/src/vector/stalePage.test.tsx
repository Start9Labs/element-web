/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "test-utils-rtl";

import Modal from "../Modal";
import ErrorDialog from "../components/views/dialogs/ErrorDialog";
import SdkConfig from "../SdkConfig";
import { watchForStalePage } from "./stalePage";

function reject(reason: unknown): void {
    window.dispatchEvent(Object.assign(new Event("unhandledrejection", { cancelable: true }), { reason }));
}

describe("watchForStalePage", () => {
    beforeEach(() => {
        SdkConfig.put({ brand: "Support" });
        vi.spyOn(Modal, "createDialog").mockReturnValue({} as ReturnType<typeof Modal.createDialog>);
        vi.spyOn(window, "matchMedia").mockImplementation(() => ({ matches: false }) as MediaQueryList);
        watchForStalePage();
    });

    afterEach(() => {
        SdkConfig.reset();
        vi.restoreAllMocks();
    });

    it("tells the user to reload when a chunk fails to load, once", () => {
        reject(Object.assign(new Error("Loading chunk 6685 failed"), { name: "ChunkLoadError" }));
        expect(Modal.createDialog).toHaveBeenCalledTimes(1);
        const [component, props] = vi.mocked(Modal.createDialog).mock.calls[0];
        expect(component).toBe(ErrorDialog);
        expect(props).toMatchObject({ title: "This page is out of date", button: "Reload" });
        const { container } = render(<>{(props as { description: React.ReactNode }).description}</>);
        expect(container.textContent).toContain("Support has been updated since this page was opened");
        expect(container.querySelectorAll("kbd").length).toBeGreaterThan(0);

        reject(Object.assign(new Error("Loading chunk 1 failed"), { name: "ChunkLoadError" }));
        expect(Modal.createDialog).toHaveBeenCalledTimes(1);
    });

    it("ignores other rejections", () => {
        reject(new Error("something else"));
        reject("not an error");
        expect(Modal.createDialog).not.toHaveBeenCalled();
    });
});
