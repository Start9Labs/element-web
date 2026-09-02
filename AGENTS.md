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
git merge v1.12.28                  # on master
# resolve, run the checks below
git push origin master v1.12.28     # the image build reads its version from the nearest tag
```

Upstream's workflows are disabled in the repo's Actions settings rather than deleted, so `.github/workflows/`
never conflicts. After a merge, disable anything a release added:

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

```bash
pnpm install --frozen-lockfile
pnpm exec nx run element-web:test:unit:prepare
cd apps/web && pnpm exec vitest run src/DeviceListener.test.ts src/utils/crypto
```

Build the image from the repo root with `docker buildx bake element-web`. It reads `.git` for the version, so
build from a clone, not an export.

## Patches

Keep each change as small as it can be, isolated, and tested beside upstream's tests. Gate on what the
homeserver advertises (`io.element.e2ee.force_disable` in `.well-known/matrix/client`) rather than on
Start9, and send anything upstream might take upstream, so the patch can go away. Add each patch to this
list — it is how a reader tells ours from upstream in a diff against the base tag.

- `apps/web/src/device-listener/DeviceListenerCurrentDevice.ts` — no "set up encryption" toast when the
  homeserver force-disables encryption and the user has no encrypted rooms.
- `.github/workflows/start9.yaml` — the only workflow that runs here: tests and the image.

## Roadmap

1. Keyless mode: skip crypto initialisation entirely when the homeserver force-disables encryption, then
   remove the UI that assumes crypto exists (encryption settings, shields, verification prompts).
2. Mobile: drop the native-app redirect and interstitial; a single-pane layout on narrow viewports (room
   list, timeline, thread panel), touch-sized controls.
3. PWA: manifest and icons for the deployment's brand, standalone display, install prompt, iOS meta tags.
