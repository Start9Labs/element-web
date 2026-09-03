/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

// @vitest-environment happy-dom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "test-utils-rtl";

import { BackToRoomListButton } from "./BackToRoomListButton";
import * as phoneLayout from "../../../../hooks/usePhoneLayout";
import defaultDispatcher from "../../../../dispatcher/dispatcher";
import { Action } from "../../../../dispatcher/actions";

describe("BackToRoomListButton", () => {
    beforeEach(() => {
        vi.spyOn(defaultDispatcher, "dispatch").mockImplementation(() => {});
    });

    it("renders nothing on a wide viewport", () => {
        vi.spyOn(phoneLayout, "usePhoneLayout").mockReturnValue(false);
        render(<BackToRoomListButton />);
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("shows the home page without leaving the active space", () => {
        vi.spyOn(phoneLayout, "usePhoneLayout").mockReturnValue(true);
        render(<BackToRoomListButton />);
        screen.getByRole("button", { name: "Back" }).click();
        expect(defaultDispatcher.dispatch).toHaveBeenCalledWith({ action: Action.ViewHomePage, context_switch: true });
    });
});
