/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { PHONE_LAYOUT_QUERY } from "../hooks/usePhoneLayout";
import UIStore from "../stores/UIStore";

// iOS keeps the layout viewport under an open keyboard and scrolls the page instead; sizing the root to the
// visual viewport keeps the composer above the keyboard, which is what `interactive-widget` does elsewhere.
export function fitRootToVisualViewport(): void {
    // eslint-disable-next-line no-restricted-properties
    const viewport = window.visualViewport;
    if (!viewport) return;
    const fit = (): void => {
        const phone = window.matchMedia(PHONE_LAYOUT_QUERY).matches;
        const keyboardOpen = viewport.scale === 1 && viewport.height < UIStore.instance.windowHeight - 1;
        document.documentElement.style.height = phone && keyboardOpen ? `${viewport.height}px` : "";
        if (phone && keyboardOpen) window.scrollTo(0, 0);
    };
    viewport.addEventListener("resize", fit);
    viewport.addEventListener("scroll", fit);
    fit();
}
