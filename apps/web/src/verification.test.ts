/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { vi, describe, it, expect } from "vitest";
import { type Room } from "matrix-js-sdk/src/matrix";
import { createTestClient, TestSDKContext } from "test-utils";

import { pendingVerificationRequestForUser, verifyUser } from "./verification";
import defaultDispatcher from "./dispatcher/dispatcher";
import DMRoomMap from "./utils/DMRoomMap.ts";
import { RightPanelPhases } from "./stores/right-panel/RightPanelStorePhases.ts";
import { findDMForUser } from "./utils/dm/findDMForUser";

vi.mock("./utils/dm/findDMForUser", () => ({ findDMForUser: vi.fn() }));

describe("verifyUser", () => {
    const sdkContext = new TestSDKContext();
    sdkContext._client = createTestClient();
    DMRoomMap.makeShared(sdkContext._client);

    it("should require registration if user is a guest", () => {
        vi.spyOn(defaultDispatcher, "dispatch");
        vi.spyOn(sdkContext._client!, "isGuest").mockReturnValue(true);
        verifyUser(
            sdkContext.rightPanelStore,
            sdkContext.client!,
            sdkContext.client!.getUser(sdkContext.client!.getUserId()!)!,
        );
        expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({ action: "require_registration" });
    });

    it("should open verification in right panel", () => {
        vi.spyOn(sdkContext.rightPanelStore, "setCards");
        vi.spyOn(sdkContext._client!, "isGuest").mockReturnValue(false);
        verifyUser(
            sdkContext.rightPanelStore,
            sdkContext.client!,
            sdkContext.client!.getUser(sdkContext.client!.getUserId()!)!,
        );
        expect(sdkContext.rightPanelStore.setCards).toHaveBeenCalledWith([
            { phase: RightPanelPhases.RoomSummary },
            expect.objectContaining({ phase: RightPanelPhases.MemberInfo }),
            expect.objectContaining({ phase: RightPanelPhases.EncryptionPanel }),
        ]);
    });
});

describe("pendingVerificationRequestForUser", () => {
    it("is undefined when crypto is disabled", () => {
        const client = createTestClient();
        vi.spyOn(client, "getCrypto").mockReturnValue(undefined);
        vi.mocked(findDMForUser).mockReturnValue({ roomId: "!dm:server" } as Room);

        expect(pendingVerificationRequestForUser(client, client.getUser(client.getUserId()!)!)).toBeUndefined();
    });
});
