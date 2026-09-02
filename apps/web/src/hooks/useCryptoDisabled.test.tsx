/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "test-utils-rtl";
import { createTestClient, withClientContextRenderOptions } from "test-utils";

import { useCryptoDisabled } from "./useCryptoDisabled";

describe("useCryptoDisabled", () => {
    it("is false without a client in context", () => {
        expect(renderHook(() => useCryptoDisabled()).result.current).toBe(false);
    });

    it("is false when the client has crypto", () => {
        const client = createTestClient();
        const { result } = renderHook(() => useCryptoDisabled(), withClientContextRenderOptions(client));
        expect(result.current).toBe(false);
    });

    it("is true when the client has no crypto", () => {
        const client = createTestClient();
        vi.spyOn(client, "getCrypto").mockReturnValue(undefined);
        const { result } = renderHook(() => useCryptoDisabled(), withClientContextRenderOptions(client));
        expect(result.current).toBe(true);
    });
});
