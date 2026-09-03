/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "test-utils-rtl";

import { PHONE_LAYOUT_QUERY, usePhoneLayout } from "./usePhoneLayout";

describe("usePhoneLayout", () => {
    const original = window.matchMedia;
    afterEach(() => {
        window.matchMedia = original;
    });

    const mockMatchMedia = (matches: boolean) => {
        const listeners = new Set<() => void>();
        const mql = {
            matches,
            media: PHONE_LAYOUT_QUERY,
            addEventListener: vi.fn((_: string, fn: () => void) => listeners.add(fn)),
            removeEventListener: vi.fn((_: string, fn: () => void) => listeners.delete(fn)),
        };
        window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
        return {
            change(next: boolean) {
                mql.matches = next;
                listeners.forEach((fn) => fn());
            },
        };
    };

    it("reports whether the phone breakpoint matches", () => {
        mockMatchMedia(true);
        expect(renderHook(() => usePhoneLayout()).result.current).toBe(true);
    });

    it("follows changes to the breakpoint", () => {
        const media = mockMatchMedia(false);
        const { result } = renderHook(() => usePhoneLayout());
        expect(result.current).toBe(false);
        act(() => media.change(true));
        expect(result.current).toBe(true);
    });

    it("is false when matchMedia is unavailable", () => {
        window.matchMedia = undefined as unknown as typeof window.matchMedia;
        expect(renderHook(() => usePhoneLayout()).result.current).toBe(false);
    });
});
