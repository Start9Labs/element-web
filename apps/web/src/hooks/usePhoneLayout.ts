/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { useEffect, useState } from "react";

/** Shared with `res/css/start9/mobile.pcss`; move them together. */
export const PHONE_LAYOUT_QUERY = "(max-width: 767px)";

export function usePhoneLayout(): boolean {
    const [matches, setMatches] = useState(() => window.matchMedia?.(PHONE_LAYOUT_QUERY).matches ?? false);
    useEffect(() => {
        const mql = window.matchMedia?.(PHONE_LAYOUT_QUERY);
        if (!mql?.addEventListener) return;
        const onChange = (): void => setMatches(mql.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, []);
    return matches;
}
