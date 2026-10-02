/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";
import { Button } from "@vector-im/compound-web";

import SdkConfig from "../../../SdkConfig";
import { _t } from "../../../languageHandler";

// Rendered inside the page's error slot, so it sets its own colour and weight over the error styling.
export function registrationMovedNotice(): JSX.Element | undefined {
    const url = SdkConfig.get().registration_moved?.url;
    if (!url) return undefined;
    const host = new URL(url).host;
    return (
        <div
            className="mx_Start9RegistrationMoved"
            style={{ color: "var(--cpd-color-text-primary)", fontWeight: "var(--cpd-font-weight-regular)" }}
        >
            <h2>{_t("start9|registration_moved|title")}</h2>
            <p>{_t("start9|registration_moved|description", { host })}</p>
            <Button as="a" href={url} kind="primary" size="md" className="mx_Login_fullWidthButton">
                {_t("start9|registration_moved|link", { host })}
            </Button>
        </div>
    );
}
