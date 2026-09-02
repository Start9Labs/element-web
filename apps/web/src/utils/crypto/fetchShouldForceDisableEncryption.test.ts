/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from "vitest";
import fetchMock from "@fetch-mock/vitest";
import { createTestClient } from "test-utils";

import { fetchShouldForceDisableEncryption } from "./fetchShouldForceDisableEncryption";
import SdkConfig from "../../SdkConfig";

describe("fetchShouldForceDisableEncryption", () => {
    const client = createTestClient();
    const wellKnownUrl = "https://matrix.org/.well-known/matrix/client";

    afterEach(() => {
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
        SdkConfig.reset();
    });

    it("is true when the well-known force-disables encryption", async () => {
        fetchMock.get(wellKnownUrl, { "io.element.e2ee": { force_disable: true } });
        expect(await fetchShouldForceDisableEncryption(client)).toBe(true);
    });

    it("is false when the well-known merely defaults encryption off", async () => {
        fetchMock.get(wellKnownUrl, { "io.element.e2ee": { default: false } });
        expect(await fetchShouldForceDisableEncryption(client)).toBe(false);
    });

    it("is false when the well-known cannot be fetched", async () => {
        fetchMock.get(wellKnownUrl, 404);
        expect(await fetchShouldForceDisableEncryption(client)).toBe(false);
    });

    it("does not fetch when well-known lookups are disabled", async () => {
        SdkConfig.add({ enable_client_well_known_lookups: false });
        fetchMock.get(wellKnownUrl, { "io.element.e2ee": { force_disable: true } });
        expect(await fetchShouldForceDisableEncryption(client)).toBe(false);
        expect(fetchMock.callHistory.called(wellKnownUrl)).toBe(false);
    });
});
