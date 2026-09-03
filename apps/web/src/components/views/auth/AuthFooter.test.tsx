/*
Copyright 2024 New Vector Ltd.
Copyright 2022 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom

import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen } from "test-utils-rtl";

import AuthFooter from "./AuthFooter";
import SdkConfig from "../../../SdkConfig";

describe("<AuthFooter />", () => {
    afterEach(() => SdkConfig.reset());

    it("should match snapshot", () => {
        const { asFragment } = render(<AuthFooter />);
        expect(asFragment()).toMatchSnapshot();
    });

    it("omits the Matrix link when branding turns it off", () => {
        SdkConfig.put({ branding: { auth_footer_powered_by_matrix: false } });
        render(<AuthFooter />);
        expect(screen.queryByText("Powered by Matrix")).toBeNull();
    });
});
