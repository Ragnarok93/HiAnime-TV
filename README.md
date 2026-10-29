# HiAnime TV

A lightweight Android TV / Fire TV wrapper for the existing website at https://hianime.ms/. It loads the live site in Android WebView instead of recreating its catalogue, backend, or player.

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

Features include an Android TV launcher entry, fullscreen landscape UI, WebView cookies and DOM storage, remote Back navigation, and HTML5 fullscreen callbacks. The wrapper relies on the TV's installed System WebView and the live site; older WebView/player/codec limitations may prevent some playback paths from working. No website assets or video content are bundled.

This project does not claim affiliation with the website operators or rights holders. Use the site and its content only where permitted by applicable law and the site's terms.
