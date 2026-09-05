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
the screen. Phone browsers are no longer redirected to a native-app page, the client offers no app-store links, and
a current phone browser (Chrome, Firefox, Safari, Edge, Samsung Internet) is not warned as unsupported.

## Installable app

The client installs as a standalone app: on Android and desktop Chrome or Edge from the address bar or browser menu,
on iOS from Share, then Add to Home Screen. `web_app_manifest` gives the installed app the deployment's name and
icon; without it the app installs as Element. Once installed, unread counts show on the app icon where the platform
supports badges.

## Push notifications

With `web_push` configured, a signed-in client that has notifications enabled subscribes to the browser's push
service and registers a pusher with the homeserver, so messages arrive while the app is closed, through Sygnal's
WebPush pushkin. The service worker shows the notification, badges the app icon with the unread count, and opens
the room when it is tapped. Turning notifications off in Element's settings removes the pusher again. iOS delivers
push only to an app on the Home Screen, so it pairs with the manifest above.

## Configuration added

All keys are optional; the default is upstream's behaviour.

- `disable_phone_login` (boolean): hide the phone-number option on sign in and the phone field on registration,
  while keeping email. Upstream's `disable_3pid_login` removes both email and phone, which breaks registration on a
  homeserver that requires an email address.
- `branding.auth_footer_powered_by_matrix` (boolean): set to `false` to drop the "Powered by Matrix" link from the
  footer of the sign-in and registration pages. `branding.auth_footer_links` still applies.
- `web_app_manifest` (object): members merged over the built-in web app manifest — `name`, `short_name` (defaults to
  `name`), `description`, `icons`, `theme_color`, `background_color`. Icon `src` values are URLs relative to the app
  root, served by the deployment the same way as `branding.auth_header_logo_url`; when given they also replace the
  favicon and the iOS touch icons. A square PNG of 512px with the mark inside the central 80% works everywhere:

    ```json
    "web_app_manifest": {
        "name": "Support",
        "icons": [{ "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }],
        "background_color": "#f0f0f0"
    }
    ```

- `web_push` (object): `gateway_url` is Sygnal's notify endpoint, `app_id` the app configured there with the WebPush
  pushkin, and `application_server_key` its VAPID public key in base64url. Sygnal must run alongside the homeserver:
  the pusher sends it the room name, sender and message text, which it encrypts for the browser.

    ```json
    "web_push": {
        "gateway_url": "https://sygnal.example.org/_matrix/push/v1/notify",
        "app_id": "org.example.chat",
        "application_server_key": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"
    }
    ```

- `mobile_builds`: upstream defaults this to Element's app-store listings; the fork defaults it to none. Set it to
  offer native apps on the unsupported-browser page.

Two upstream keys worth knowing here: `embedded_pages.login_for_welcome: true` lands logged-out visitors on Sign in
instead of the welcome page, and `setting_defaults."UIFeature.identityServer": false` hides identity-server features,
which also stops the registration form promising discovery by email.
