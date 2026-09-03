/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom
// @vitest-environment-options {"url": "https://chat.example.org/"}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientEvent, type MatrixClient, SyncState } from "matrix-js-sdk/src/matrix";

import SdkConfig from "../../SdkConfig";
import SettingsStore from "../../settings/SettingsStore";
import PlatformPeg from "../../PlatformPeg";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { startWebPush } from "./webPush";
import { VIEW_ROOM_MESSAGE } from "./protocol";

const KEY = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
const KEY_BYTES = Uint8Array.from(atob(KEY.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

describe("startWebPush", () => {
    const subscription = {
        endpoint: "https://push.example.net/abc",
        options: { applicationServerKey: KEY_BYTES.buffer },
        toJSON: () => ({ endpoint: "https://push.example.net/abc", keys: { p256dh: "P256DH", auth: "AUTH" } }),
        unsubscribe: vi.fn().mockResolvedValue(true),
    };
    const pushManager = { getSubscription: vi.fn(), subscribe: vi.fn() };
    let onMessage: (event: MessageEvent) => void;
    const serviceWorker = {
        ready: Promise.resolve({ pushManager }),
        addEventListener: vi.fn((_type: string, listener: (event: MessageEvent) => void) => {
            onMessage = listener;
        }),
    };
    const client = {
        getPushers: vi.fn(),
        setPusher: vi.fn().mockResolvedValue({}),
        on: vi.fn(),
    } as unknown as MatrixClient;
    const start = (): void => {
        startWebPush(client);
        const onSync = vi.mocked(client.on).mock.calls.find(([event]) => event === ClientEvent.Sync)?.[1] as
            | ((state: SyncState) => void)
            | undefined;
        onSync?.(SyncState.Prepared);
    };
    let notificationsEnabled = true;

    beforeEach(() => {
        SdkConfig.put({
            brand: "Support",
            web_push: {
                gateway_url: "https://sygnal.example.org/_matrix/push/v1/notify",
                app_id: "org.example.chat",
                application_server_key: KEY,
            },
            web_app_manifest: { icons: [{ src: "icon.png" }] },
        });
        vi.stubGlobal("PushManager", class {});
        vi.stubGlobal("Notification", { permission: "granted" });
        Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: serviceWorker });
        vi.spyOn(SettingsStore, "getValue").mockImplementation(() => notificationsEnabled);
        vi.spyOn(SettingsStore, "watchSetting").mockReturnValue("watcher");
        vi.spyOn(SettingsStore, "unwatchSetting").mockImplementation(() => {});
        vi.spyOn(PlatformPeg, "get").mockReturnValue({
            getDefaultDeviceDisplayName: () => "Chrome on Android",
        } as unknown as ReturnType<typeof PlatformPeg.get>);
        pushManager.getSubscription.mockResolvedValue(null);
        pushManager.subscribe.mockResolvedValue(subscription);
        vi.mocked(client.getPushers).mockResolvedValue({ pushers: [] });
        notificationsEnabled = true;
    });

    afterEach(() => {
        SdkConfig.reset();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        vi.clearAllMocks();
    });

    it("subscribes and registers a pusher pointing at the gateway", async () => {
        start();
        await vi.waitFor(() => expect(client.setPusher).toHaveBeenCalled());
        expect(pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: KEY_BYTES });
        expect(client.setPusher).toHaveBeenCalledWith({
            kind: "http",
            app_id: "org.example.chat",
            pushkey: "P256DH",
            app_display_name: "Support",
            device_display_name: "Chrome on Android",
            lang: navigator.language,
            data: {
                url: "https://sygnal.example.org/_matrix/push/v1/notify",
                endpoint: "https://push.example.net/abc",
                auth: "AUTH",
                events_only: true,
                only_last_per_room: true,
                default_payload: { icon: "https://chat.example.org/icon.png" },
            },
            append: false,
        });
    });

    it("runs one sync at a time", async () => {
        const registered: unknown[] = [];
        vi.mocked(client.setPusher).mockImplementation(async (pusher) => {
            registered.push(pusher);
            return {};
        });
        vi.mocked(client.getPushers).mockImplementation(async () => ({ pushers: registered as never }));
        pushManager.getSubscription.mockResolvedValueOnce(null).mockResolvedValue(subscription);
        start();
        const onSettingChange = vi.mocked(SettingsStore.watchSetting).mock.calls[0][2];
        onSettingChange("notificationsEnabled", null, "device", true, true);
        await vi.waitFor(() => expect(client.getPushers).toHaveBeenCalledTimes(2));
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
        expect(client.setPusher).toHaveBeenCalledTimes(1);
    });

    it("keeps a pusher that already matches the subscription", async () => {
        pushManager.getSubscription.mockResolvedValue(subscription);
        vi.mocked(client.getPushers).mockResolvedValue({
            pushers: [{ app_id: "org.example.chat", pushkey: "P256DH" } as never],
        });
        start();
        await vi.waitFor(() => expect(client.getPushers).toHaveBeenCalled());
        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(client.setPusher).not.toHaveBeenCalled();
    });

    it("renews a subscription made with another key", async () => {
        pushManager.getSubscription.mockResolvedValue({
            ...subscription,
            options: { applicationServerKey: new Uint8Array([1, 2, 3]).buffer },
        });
        start();
        await vi.waitFor(() => expect(client.setPusher).toHaveBeenCalled());
        expect(subscription.unsubscribe).toHaveBeenCalled();
        expect(pushManager.subscribe).toHaveBeenCalled();
    });

    it("removes the pusher and subscription once notifications are off", async () => {
        notificationsEnabled = false;
        pushManager.getSubscription.mockResolvedValue(subscription);
        start();
        await vi.waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalled());
        expect(client.setPusher).toHaveBeenCalledWith(expect.objectContaining({ kind: null, pushkey: "P256DH" }));
        expect(pushManager.subscribe).not.toHaveBeenCalled();
    });

    it("shows the room a notification was tapped for", async () => {
        start();
        await vi.waitFor(() => expect(client.setPusher).toHaveBeenCalled());
        const dispatch = vi.spyOn(defaultDispatcher, "dispatch");
        onMessage(new MessageEvent("message", { data: { type: VIEW_ROOM_MESSAGE, roomId: "!room:example.org" } }));
        expect(dispatch).toHaveBeenCalledWith({
            action: Action.ViewRoom,
            room_id: "!room:example.org",
            metricsTrigger: "Notification",
        });
    });

    it("waits for the first sync before touching the pusher", async () => {
        startWebPush(client);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(pushManager.getSubscription).not.toHaveBeenCalled();
        expect(SettingsStore.watchSetting).toHaveBeenCalledWith("notificationsEnabled", null, expect.any(Function));
    });

    it("does nothing without web_push", async () => {
        SdkConfig.put({ brand: "Support" });
        startWebPush(client);
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(client.on).not.toHaveBeenCalled();
        expect(pushManager.getSubscription).not.toHaveBeenCalled();
        expect(SettingsStore.watchSetting).not.toHaveBeenCalled();
    });
});
