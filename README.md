# HiAnime TV

A remote-first Android TV / Fire TV interface for browsing the live catalogue at [hianime.ms](https://hianime.ms/). The app now opens a locally bundled 10-foot UI with a large featured area, horizontal poster shelves, search, anime details, and episode selection rather than dropping viewers straight into the touch-oriented website.

## How it works

- **Bundled TV interface:** HTML/CSS/JavaScript shipped in the APK; large focus targets and directional navigation for a TV remote.
- **Live catalogue adapter:** reads the current homepage, browse cards, search results, title descriptions, and episode links from the configured website at runtime. The site markup is not a stable API, so a site redesign may require adapter updates.
- **Graceful catalogue recovery:** caches the last non-empty catalogue locally and shows it with a retry action if the live site is unavailable. Continue Watching remains available from local history; cached links can become stale.
- **In-app playback view:** episode selection opens a dedicated playback overlay inside the bundled TV interface and embeds the site's watch page in a player frame. The TV home/details UI remains underneath, and Back closes the overlay first. If the site blocks embedding, viewers can explicitly choose **Open full player** as a compatibility fallback. This preserves the site's session and server selection flow instead of extracting stream URLs.
- **Fire TV shell:** fullscreen landscape activity, Leanback launcher entry, persistent WebView cookies/storage, remote Back handling, and fullscreen video callbacks.

Target: Fire OS 6 / Android API 25-class devices, including Toshiba Fire TV AFTBAMR311. The app targets API 28 for legacy compatibility and supports Android API 21+.

## Build

Requires JDK 17 and Gradle 8.7:

```sh
gradle --no-daemon assembleDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`.

GitHub Actions builds the debug APK and uploads it as `hianime-tv-debug-apk`.

## Install

Download the APK artifact from a successful Actions run, then:

```sh
adb connect TV_IP_ADDRESS:5555
adb install -r app-debug.apk
```

The debug package name is `com.ragnarok93.hianimetv.debug`.

## Limitations

Catalogue parsing depends on the live site's HTML structure and may need maintenance if that changes. Playback is an in-app embedded view of the site's player, not a custom native streaming engine; some site/player configurations may block iframe embedding and require the explicit full-player fallback. The build can be verified in CI, but actual D-pad behavior and playback must still be tested on the target TV.

This project does not claim affiliation with the website operators or rights holders. Use the site and its content only where permitted by applicable law and the site's terms.
