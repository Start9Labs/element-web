# What this fork changes

[Start9Labs/element-web](https://github.com/Start9Labs/element-web) tracks upstream Element Web releases and adds
what a homeserver that runs without end-to-end encryption needs, plus a phone layout. Nothing here is specific to
Start9; the deployment choices are configuration.

## Keyless mode

When the homeserver's `.well-known/matrix/client` sets `io.element.e2ee.force_disable`, the client never initialises
crypto, and every screen that would push the user towards encryption, verification, key backup or recovery is
omitted. Informational hints stay (the composer's open padlock, the "Not encrypted" badge). Keyed homeservers are
unaffected. No configuration is needed beyond the well-known.

## Phone layout

Below 768px the client shows one pane at a time: the room list, the room, or a right-panel card such as a thread or
room info, with a back button in the room header. Dialogs and the sign-in, register and forgot-password pages fit
the screen. Phone browsers are no longer redirected to a native-app page, and the client offers no app-store links.

## Configuration added

All keys are optional; the default is upstream's behaviour.

- `disable_phone_login` (boolean): hide the phone-number option on sign in and the phone field on registration,
  while keeping email. Upstream's `disable_3pid_login` removes both email and phone, which breaks registration on a
  homeserver that requires an email address.
- `branding.auth_footer_powered_by_matrix` (boolean): set to `false` to drop the "Powered by Matrix" link from the
  footer of the sign-in and registration pages. `branding.auth_footer_links` still applies.
- `mobile_builds`: upstream defaults this to Element's app-store listings; the fork defaults it to none. Set it to
  offer native apps on the unsupported-browser page.

Two upstream keys worth knowing here: `embedded_pages.login_for_welcome: true` lands logged-out visitors on Sign in
instead of the welcome page, and `setting_defaults."UIFeature.identityServer": false` hides identity-server features,
which also stops the registration form promising discovery by email.
