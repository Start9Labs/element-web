/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { ClientEvent, type IPusherRequest, type MatrixClient, SyncState } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";

import { type IConfigOptions } from "../../IConfigOptions";
import SdkConfig from "../../SdkConfig";
import SettingsStore from "../../settings/SettingsStore";
import PlatformPeg from "../../PlatformPeg";
import defaultDispatcher from "../../dispatcher/dispatcher";
import { Action } from "../../dispatcher/actions";
import { type ViewRoomPayload } from "../../dispatcher/payloads/ViewRoomPayload";
import { VIEW_ROOM_MESSAGE } from "./protocol";

type WebPushConfig = NonNullable<IConfigOptions["web_push"]>;

let settingWatcher: string | undefined;
let listening = false;
let queue = Promise.resolve();

export function startWebPush(client: MatrixClient): void {
    if (!("PushManager" in window) || !("Notification" in window) || !navigator.serviceWorker) return;
    const config = SdkConfig.get("web_push");
    const served = !!config && (!config.homeservers || config.homeservers.includes(hostnameOf(client.baseUrl)));
    const sync = (): void => {
        queue = queue
            .then(() => (served ? syncPusher(client, config) : dropPusher(client)))
            .catch((e) => logger.warn("Web push: could not update the pusher", e));
    };
    if (settingWatcher) SettingsStore.unwatchSetting(settingWatcher);
    settingWatcher = served ? SettingsStore.watchSetting("notificationsEnabled", null, sync) : undefined;
    if (served && !listening) {
        listening = true;
        navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
    }
    client.on(ClientEvent.Sync, (state) => {
        if (state === SyncState.Prepared) sync();
    });
}

function onServiceWorkerMessage(event: MessageEvent): void {
    if (event.data?.type !== VIEW_ROOM_MESSAGE) return;
    defaultDispatcher.dispatch<ViewRoomPayload>({
        action: Action.ViewRoom,
        room_id: event.data.roomId,
        metricsTrigger: "Notification",
    });
}

async function syncPusher(client: MatrixClient, config: WebPushConfig): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const key = base64UrlToBytes(config.application_server_key);
    let subscription = await registration.pushManager.getSubscription();
    const currentKey = subscription?.options.applicationServerKey;
    if (subscription && currentKey && !equalBytes(new Uint8Array(currentKey), key)) {
        await subscription.unsubscribe();
        subscription = null;
    }
    if (!SettingsStore.getValue("notificationsEnabled") || Notification.permission !== "granted") {
        if (!subscription) return;
        await client.setPusher({ ...pusherFor(config, subscription), kind: null } as unknown as IPusherRequest);
        await subscription.unsubscribe();
        return;
    }
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
    const pusher = pusherFor(config, subscription);
    const { pushers } = await client.getPushers();
    const existing = pushers.find((it) => it.app_id === pusher.app_id && it.pushkey === pusher.pushkey);
    if (existing?.data.url === pusher.data.url) return;
    await client.setPusher(pusher);
}

async function dropPusher(client: MatrixClient): Promise<void> {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const pushkey = subscription.toJSON().keys?.p256dh;
    const { pushers } = await client.getPushers();
    for (const pusher of pushers.filter((it) => it.pushkey === pushkey)) {
        await client.setPusher({ ...pusher, kind: null } as unknown as IPusherRequest);
    }
    await subscription.unsubscribe();
}

function pusherFor(config: WebPushConfig, subscription: PushSubscription): IPusherRequest {
    const { endpoint, keys } = subscription.toJSON();
    if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error("push subscription without keys");
    const data = {
        url: config.gateway_url,
        endpoint,
        auth: keys.auth,
        events_only: true,
        only_last_per_room: true,
        default_payload: {
            icon: new URL(
                SdkConfig.get("web_app_manifest")?.icons?.[0]?.src ?? "vector-icons/180.png",
                document.baseURI,
            ).href,
        },
    };
    return {
        kind: "http",
        app_id: config.app_id,
        pushkey: keys.p256dh,
        app_display_name: SdkConfig.get("brand"),
        device_display_name: PlatformPeg.get()?.getDefaultDeviceDisplayName() ?? navigator.userAgent,
        lang: navigator.language,
        data,
        append: false,
    };
}

function hostnameOf(url: string): string {
    try {
        return new URL(url).hostname.replace(/^\[(.*)\]$/, "$1");
    } catch {
        return "";
    }
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
    return a.length === b.length && a.every((byte, i) => byte === b[i]);
}
