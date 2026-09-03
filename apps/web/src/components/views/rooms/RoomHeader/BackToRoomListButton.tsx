/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { IconButton, Tooltip } from "@vector-im/compound-web";
import ChevronLeftIcon from "@vector-im/compound-design-tokens/assets/web/icons/chevron-left";

import { _t } from "../../../../languageHandler";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { Action } from "../../../../dispatcher/actions";
import { type ViewHomePagePayload } from "../../../../dispatcher/payloads/ViewHomePagePayload";
import { usePhoneLayout } from "../../../../hooks/usePhoneLayout";

/** Showing the home page unmounts the room, which puts the list on screen; `context_switch` keeps the active space. */
export function backToRoomList(): void {
    defaultDispatcher.dispatch<ViewHomePagePayload>({ action: Action.ViewHomePage, context_switch: true });
}

/** On a phone the room fills the screen, so the header needs a way back to the room list. */
export function BackToRoomListButton(): JSX.Element | null {
    const phone = usePhoneLayout();
    if (!phone) return null;
    return (
        <Tooltip label={_t("action|back")}>
            <IconButton className="mx_RoomHeader_backButton" aria-label={_t("action|back")} onClick={backToRoomList}>
                <ChevronLeftIcon />
            </IconButton>
        </Tooltip>
    );
}
