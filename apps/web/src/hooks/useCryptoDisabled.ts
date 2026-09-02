/*
Copyright 2026 Start9 Labs, Inc.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only
Please see LICENSE files in the repository root for full details.
*/

import { useContext } from "react";

import MatrixClientContext from "../contexts/MatrixClientContext";

/** Whether this session runs without crypto; without a client in context (leaf tests) crypto counts as available. */
export function useCryptoDisabled(): boolean {
    const client = useContext(MatrixClientContext);
    return !!client && !client.getCrypto();
}
