/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { notificationFor, onPush, openRoom } from "./push";
import { VIEW_ROOM_MESSAGE } from "../utils/push/protocol";

const message = {
    room_id: "!room:example.org",
    event_id: "$event",
    room_name: "Support",
    sender_display_name: "Alice",
    content: { body: "hi" },
    unread: 3,
    icon: "https://chat.example.org/icon.png",
};

describe("push service worker", () => {
    const showNotification = vi.fn();
    const matchAll = vi.fn();
    const openWindow = vi.fn();
    const setAppBadge = vi.fn();

    beforeEach(() => {
        vi.stubGlobal("registration", { showNotification, scope: "https://chat.example.org/" });
        vi.stubGlobal("clients", { matchAll, openWindow });
        Object.defineProperty(navigator, "setAppBadge", { configurable: true, value: setAppBadge });
        matchAll.mockResolvedValue([]);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
    });

    describe("notificationFor", () => {
        it("names the room and prefixes the sender", () => {
            expect(notificationFor(message)).toEqual({
                title: "Support",
                options: {
                    body: "Alice: hi",
                    tag: "!room:example.org",
                    renotify: true,
                    icon: "https://chat.example.org/icon.png",
                    data: { roomId: "!room:example.org" },
                },
            });
        });

        it("drops the prefix in a direct chat", () => {
            expect(notificationFor({ ...message, room_name: "Alice" })).toMatchObject({
                title: "Alice",
                options: { body: "hi" },
            });
        });

        it("ignores a push without an event", () => {
            expect(notificationFor({ unread: 0 })).toBeUndefined();
        });
    });

    describe("onPush", () => {
        it("shows the notification and badges the app", async () => {
            await onPush(message);
            expect(setAppBadge).toHaveBeenCalledWith(3);
            expect(showNotification).toHaveBeenCalledWith("Support", expect.objectContaining({ body: "Alice: hi" }));
        });

        it("leaves a visible window to notify itself", async () => {
            matchAll.mockResolvedValue([{ visibilityState: "visible" }]);
            await onPush(message);
            expect(setAppBadge).toHaveBeenCalledWith(3);
            expect(showNotification).not.toHaveBeenCalled();
        });
    });

    describe("openRoom", () => {
        it("focuses an open window and asks it to show the room", async () => {
            const window = {
                visibilityState: "hidden",
                focus: vi.fn().mockResolvedValue(undefined),
                postMessage: vi.fn(),
            };
            matchAll.mockResolvedValue([window]);
            await openRoom("!room:example.org");
            expect(window.focus).toHaveBeenCalled();
            expect(window.postMessage).toHaveBeenCalledWith({ type: VIEW_ROOM_MESSAGE, roomId: "!room:example.org" });
            expect(openWindow).not.toHaveBeenCalled();
        });

        it("opens the app on the room otherwise", async () => {
            await openRoom("!room:example.org");
            expect(openWindow).toHaveBeenCalledWith("https://chat.example.org/#/room/!room:example.org");
        });
    });
});
