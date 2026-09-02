# Start9 fork of Element Web

Start9's fork of [element-hq/element-web](https://github.com/element-hq/element-web): the web client at
`support.start9.me`, shipped as `ghcr.io/start9labs/element-web` and deployed by `ansible-matrix-support`.
Upstream's own docs still apply — [README.md](README.md), [CONTRIBUTING.md](CONTRIBUTING.md),
[developer_guide.md](developer_guide.md), `docs/`. This file covers only what is different here.

`start9.me` runs with end-to-end encryption disabled and its users keyless, so the client has to work well
with encryption off, on a phone, and installed as a PWA. Upstream is built for the opposite: it nags to set
up encryption, sends phone browsers to the native apps, and lays out for the desktop.

## Branches

- `master` is the fork: an upstream release tag with our patches on top. Commit to it directly; a release
  is a tag, so `master` only ever feeds the `:master` test image.
- Upstream is merged, never rebased, so history stays shared and each release lands as one merge. Merge
  release tags only, never `develop`.
- `upstream` remote: `git remote add upstream https://github.com/element-hq/element-web.git`.

## Taking an upstream release

```bash
git fetch upstream --tags
git merge -Xignore-space-change v1.12.28   # on master
pnpm lint:fmt:fix                          # re-indent the blocks a patch wraps
# resolve what is left, run the checks below
git push origin master v1.12.28            # the image build reads its version from the nearest tag
```

`-Xignore-space-change` lets upstream's edits win inside a block a patch only re-indented; the formatter puts the
indentation back. Upstream's workflows are disabled in the repo's Actions settings rather than deleted, so
`.github/workflows/` never conflicts. After a merge, disable anything a release added:

```bash
gh workflow list --all   # everything except "Start9" should read `disabled_manually`
gh workflow disable <name>
```

## Releasing

Tag `master` as `v<upstream>-start9.<n>`, for example `v1.12.27-start9.1`. The `Start9` workflow publishes
`ghcr.io/start9labs/element-web:<tag>` and `:latest` for amd64 and arm64; a push to `master` publishes
`:master` and `:sha-<short>` for testing. Deploy by pointing `matrix_client_element_container_image` in
`ansible-matrix-support` at the tag.

## Checks

CI runs upstream's full jest and vitest suites, so an upstream merge that breaks a patch fails there. Locally, run
the files you touched:

```bash
pnpm install --frozen-lockfile
pnpm exec nx run element-web:test:unit:prepare
cd apps/web && pnpm exec vitest run src/hooks src/utils/crypto   # vitest: src/**/*.test.ts*
cd apps/web && pnpm exec jest test/unit-tests/components/views/settings/devices   # jest: test/unit-tests/**/*-test.ts*
```

`lint:types` is red at upstream's own release tags at the moment (matrix-js-sdk under TypeScript 7), so check it
with `pnpm exec tsc --noEmit 2>&1 | grep -v MSC4108SignInWithQR` in `apps/web` until that clears.

Build the image from the repo root with `docker buildx bake element-web`. It reads `.git` for the version, so
build from a clone, not an export.

## Patches

Keyless mode is one decision: when the homeserver's `.well-known/matrix/client` sets `io.element.e2ee.force_disable`,
the client never initialises crypto (`fetchShouldForceDisableEncryption`, called once from `MatrixClientPeg.assign`).
Everything else follows from `client.getCrypto()` being undefined, a state upstream already tolerates for its
low-bandwidth mode; each component that still rendered encryption UI in that state guards itself.

The bar for what to remove: the user may learn that encryption is off, but nothing may look like an error or push
them to enable encryption, verify a session, or set up backup or recovery. Upstream's informational hints stay: the
composer's open padlock and "unencrypted" placeholder, the "Not encrypted" badge, and the disabled encryption toggles
with their explanations.

Rules for a patch, so that upstream merges stay cheap:

- New logic goes in a new file. An upstream file gets an import and a one-line guard, in the component that renders
  the UI. Never plumb a prop through intermediate components.
- Gate on `client.getCrypto()` (`useCryptoDisabled()` in function components), not on Start9 or on the well-known.
  Keyed homeservers keep upstream's behaviour, and the guard doubles as a fix for low-bandwidth mode, which is what
  makes it worth sending upstream.
- Prefer adding a line after upstream's block to editing lines inside it. When a wrapper is unavoidable, accept the
  re-indent; the merge procedure above absorbs it.
- Tests: fork behaviour in a new test file where the setup is small, otherwise one
  `describe("when crypto is disabled")` in upstream's test that restores any shared mock afterwards.
- Add every upstream file touched to the list below; a reader diffing against the base tag uses it to tell ours from
  theirs.

Upstream files carrying a patch (under `apps/web/src/` unless noted):

- `MatrixClientPeg.ts` — skip crypto initialisation; the only place the well-known decides anything.
- `verification.ts` — pending-verification lookup tolerates missing crypto.
- `device-listener/DeviceListenerCurrentDevice.ts` — no setup-encryption toast when the homeserver force-disables
  encryption and no room is encrypted; covers a session that started while the well-known was unreachable.
- `components/views/dialogs/UserSettingsDialog.tsx` — no Encryption tab.
- `components/views/settings/tabs/user/SecurityUserSettingsTab.tsx` — no encryption section, no "encryption
  disabled by your admin" warning.
- `components/views/settings/tabs/user/HelpUserSettingsTab.tsx` — no crypto version line.
- `components/views/settings/devices/{DeviceTypeIcon,DeviceVerificationStatusCard,SecurityRecommendations,LoginWithQRSection,FilteredDeviceList}.tsx`
  — a Sessions tab without verification badges, cards, recommendations, filters, or QR sign-in.
- `components/views/rooms/NewRoomIntro.tsx` — no "encryption isn't enabled" warning in a new DM; upstream already
  hides it once the well-known is known, this covers the first render after login.
- `.github/workflows/start9.yaml` — the only workflow that runs here.

Fork-only files: `utils/crypto/fetchShouldForceDisableEncryption.ts`, `hooks/useCryptoDisabled.ts`, their tests.

## Roadmap

1. Mobile: drop the native-app redirect and interstitial; a single-pane layout on narrow viewports (room
   list, timeline, thread panel), touch-sized controls.
2. PWA: manifest and icons for the deployment's brand, standalone display, install prompt, iOS meta tags.
