/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";

import Modal from "../Modal";
import ErrorDialog from "../components/views/dialogs/ErrorDialog";
import { KeyboardShortcut } from "../components/views/settings/KeyboardShortcut";
import { PHONE_LAYOUT_QUERY } from "../hooks/usePhoneLayout";
import { _t } from "../languageHandler";
import SdkConfig from "../SdkConfig";

let shown = false;

// A deploy replaces the build's files, so a page opened before it fails the next time it loads a chunk on demand.
export function watchForStalePage(): void {
    window.addEventListener("unhandledrejection", (event) => {
        if (!(event.reason instanceof Error) || event.reason.name !== "ChunkLoadError" || shown) return;
        shown = true;
        event.preventDefault();
        Modal.createDialog(ErrorDialog, {
            title: _t("start9|stale_page|title"),
            description: <StalePageDescription />,
            button: _t("action|reload"),
            onFinished: () => window.location.reload(),
        });
    });
}

function StalePageDescription(): JSX.Element {
    const phone = window.matchMedia(PHONE_LAYOUT_QUERY).matches;
    return (
        <>
            <p>{_t("start9|stale_page|description", { brand: SdkConfig.get().brand })}</p>
            <p>{phone ? _t("start9|stale_page|phone") : _t("start9|stale_page|keys")}</p>
            {!phone && <KeyboardShortcut value={{ ctrlOrCmdKey: true, shiftKey: true, key: "R" }} />}
        </>
    );
}
