# Android release build

How to build the installable Android app (APK) on a Windows PC and put it on a phone without Expo Go.

## Install the ready-made APK

The latest build is in `releases/` (for example `releases/dnata-vault-1.0.0.apk`). Copy it to the phone (Google Drive, a chat app or USB file transfer) and open it. The phone asks you to allow installs from that app the first time.

If an older Dnata Vault is already on the phone and was signed with a different key, Android refuses the update with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. Uninstall the old app first. This deletes the receipts and orders it saved on the phone.

## Build the APK

Prerequisites: Android Studio (for its JDK and the Android SDK, with NDK 27.1.12297006), Node.js, and `npm install` in the project root.

The native project is committed in `android/`. If you change `app.json` or add a package with native code, regenerate it and commit the result:

```bash
npx expo prebuild --platform android --clean
```

Then, from PowerShell:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "D:\Android\Sdk"      # see "SDK path with a space" below
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
cd android
.\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a "-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m"
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. `arm64-v8a` covers current Android phones and keeps the build fast. Drop that flag to build for every CPU type.

The release build is signed with the public debug key in `android/app/debug.keystore`. That is fine for internal testing, but a Play Store release needs its own upload key (EAS Build can manage it).

## Problems we hit and their fixes

### SDK path with a space

If the Android SDK is under a folder with a space in it (for example `C:\Users\First Last\AppData\Local\Android\Sdk`), the C++ link step fails with hundreds of `undefined symbol: std::...`, `operator new` or `__cxa_...` errors. To get around the space, the build calls the compiler by its short Windows name `CLANG_~1`, and clang then links as C instead of C++.

Fix: point the build at a path without a space. A directory junction avoids copying the SDK:

```powershell
New-Item -ItemType Directory -Force D:\Android
cmd /c mklink /J "D:\Android\Sdk" "$env:LOCALAPPDATA\Android\Sdk"
Set-Content -Encoding ascii android\local.properties "sdk.dir=D\:\\Android\\Sdk"
Remove-Item -Recurse -Force android\app\.cxx, node_modules\expo-modules-core\android\.cxx -ErrorAction SilentlyContinue
```

`android/local.properties` is machine-specific and stays out of git.

### Not enough space on C:

The first build downloads several GB into the Gradle cache and the temp folder. If C: is nearly full, move both to another drive before building:

```powershell
$env:GRADLE_USER_HOME = "D:\.gradle"
$env:TEMP = "D:\tmp"; $env:TMP = "D:\tmp"
$env:JAVA_TOOL_OPTIONS = "-Djava.io.tmpdir=D:\tmp"
```

### Gradle running out of memory

A warning about JVM Metaspace means Gradle needs more memory. The `-Dorg.gradle.jvmargs=...` flag in the build command above gives it 4 GB of heap and 1 GB of metaspace.

## Install from the PC with adb

`adb install` fails with `INSTALL_PARSE_FAILED_NO_CERTIFICATES ... digest of contents did not verify`, or `adb` hangs, when the USB cable or port corrupts data. Check by comparing checksums:

```powershell
adb push app-release.apk /data/local/tmp/dnata.apk
adb shell sha256sum /data/local/tmp/dnata.apk
(Get-FileHash app-release.apk).Hash.ToLower()
```

If they differ, try another cable or a port on the back of the PC, or install over Wi-Fi (phone and PC on the same network):

```powershell
adb tcpip 5555                      # once, while connected by USB
adb connect <phone-ip>:5555         # phone IP: Settings > About phone > Status
adb -s <phone-ip>:5555 push android\app\build\outputs\apk\release\app-release.apk /data/local/tmp/dnata.apk
adb -s <phone-ip>:5555 shell pm install -r /data/local/tmp/dnata.apk
adb -s <phone-ip>:5555 shell rm /data/local/tmp/dnata.apk
```

Wi-Fi debugging stays on until the phone restarts.
