/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { VIEW_ROOM_MESSAGE } from "../utils/push/protocol";

// What Sygnal's WebPush pushkin sends, plus the pusher's default_payload
export interface PushPayload {
    room_id?: string;
    event_id?: string;
    room_name?: string;
    sender_display_name?: string;
    content?: { body?: string };
    unread?: number;
    icon?: string;
}

export interface PushNotification {
    title: string;
    options: NotificationOptions & { renotify?: boolean };
}

interface WindowClientLike {
    visibilityState: string;
    focus(): Promise<unknown>;
    postMessage(message: unknown): void;
}

interface PushEventLike {
    data: { json(): PushPayload } | null;
    waitUntil(promise: Promise<unknown>): void;
}

interface NotificationClickEventLike {
    notification: Notification;
    waitUntil(promise: Promise<unknown>): void;
}

const sw = globalThis as unknown as {
    registration: ServiceWorkerRegistration;
    clients: {
        matchAll(options: { type: "window"; includeUncontrolled?: boolean }): Promise<WindowClientLike[]>;
        openWindow(url: string): Promise<unknown>;
    };
    navigator: { setAppBadge?(count: number): Promise<void> };
    addEventListener(type: "push", listener: (event: PushEventLike) => void): void;
    addEventListener(type: "notificationclick", listener: (event: NotificationClickEventLike) => void): void;
};

export function notificationFor(payload: PushPayload): PushNotification | undefined {
    if (!payload.room_id || !payload.event_id) return;
    const { room_name: room, sender_display_name: sender } = payload;
    const text = payload.content?.body || "New message";
    return {
        title: room ?? sender ?? "New message",
        options: {
            body: sender && room && sender !== room ? `${sender}: ${text}` : text,
            tag: payload.room_id,
            renotify: true,
            icon: payload.icon,
            data: { roomId: payload.room_id },
        },
    };
}

export async function onPush(payload: PushPayload): Promise<void> {
    if (payload.unread !== undefined) await sw.navigator.setAppBadge?.(payload.unread);
    const windows = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.some((window) => window.visibilityState === "visible")) return;
    const notification = notificationFor(payload);
    if (notification) await sw.registration.showNotification(notification.title, notification.options);
}

export async function openRoom(roomId: string): Promise<void> {
    const [window] = await sw.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (window) {
        await window.focus();
        window.postMessage({ type: VIEW_ROOM_MESSAGE, roomId });
    } else {
        await sw.clients.openWindow(new URL(`#/room/${roomId}`, sw.registration.scope).href);
    }
}

sw.addEventListener("push", (event) => event.waitUntil(onPush(event.data?.json() ?? {})));
sw.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const roomId = event.notification.data?.roomId;
    if (roomId) event.waitUntil(openRoom(roomId));
});
