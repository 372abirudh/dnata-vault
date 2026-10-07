# dnata Vault

The dnata Vault mobile app, built with Expo (React Native, SDK 57) from the **Vault App** design in Claude Design (`Vault App copy.dc.html`). It runs on iOS and Android.

## What's in the app

- **Home**: hero with today's activity, a Receipts / Orders switch, status tabs with counts, search, notifications, profile and the create (+) menu.
- **Goods receipts (inbound)**: create a GRN, then assign staff and verify the goods in four steps (handover, counts by piece or package, lot/weight/seal/bar numbers, labels). After that, sign the valuable handling receipt and put the packages away (account, facility, vault and a bin per package, with bin scanning). The record has Overview, Goods, Handover, Activity and Docs tabs.
- **Put away**: a list with KPIs and a facility/status filter. Each request has Storage, Packages, Source receipt and Chain of custody tabs.
- **Orders (outbound)**:
  - Create an order from facility stock, with FIFO or manual bar selection, and allocate it to a picker.
  - Pick bars from FIFO packages. You can change the package date and edit bars.
  - Pack into bags, split the quantity and seal each bag.
  - Dispatch with recipient, delivery, handover, courier and driver details plus a signature.
  - Capture proof of delivery (Emirates ID photo and signature), then view or print the POD document.
  - Each order also has attachments, billable activities and an activity timeline.

The app uses these native features:

- Camera scanning for seals, bins and bar numbers, with manual entry as a fallback.
- Finger signature pads.
- Document and photo pickers.
- Printing and PDF sharing for the VHR, package labels and POD.

The app starts with sample data. Receipts and orders are saved on the phone after every change, so they survive closing and reopening the app. To restore the demo data, go to **Profile → Reset sample data**.

## Branding

`node scripts/gen-brand.js` generates the app icon, the Android adaptive icon layers, the splash image and the favicon from the dnata logo. Expo Go shows its own loading screen, so the splash screen only appears in an installed build.

## Run it on your phone

1. Install **Expo Go** on the phone from the App Store or Google Play.
2. Connect the phone and the laptop to the same Wi-Fi network.
3. On the laptop:

   ```bash
   npm install
   npx expo start
   ```

4. Scan the QR code in the terminal. On Android, use the Expo Go app; on iPhone, use the Camera app. Alternatively, type the `exp://…` address into Expo Go.

If the phone can't reach the laptop (for example on office or guest Wi-Fi), use `npx expo start --tunnel` instead.

## Install the app without Expo Go

A ready-made Android APK is in `releases/`. To build a new one, and for fixes to common Windows build and install problems, see [docs/android-build.md](docs/android-build.md).

## Code map

```
App.tsx                     root: list page, pushed pages, sheets, app-wide overlays
src/theme/tokens.ts         colors, radii, shadows, type (SF Pro on iOS, Inter elsewhere), status tones
src/icons/                  Phosphor icons by design name (paths.ts is generated: node scripts/gen-icons.js)
src/data/                   types, master data, catalog and stock packages, sample receipts and orders
src/store/                  zustand store: data (saved to the phone), screen state and every workflow action
src/logic/                  status flows, prompts, tones; printable document HTML
src/components/ds.tsx       design-system primitives (Button, TextField, StatusChip, SegmentedControl, …)
src/components/vault.tsx    shared app components (hero, record card, nav, detail header, timeline, sheet header/footer, …)
src/components/overlay.tsx  bottom sheets and pushed pages (animations, drag to close, Android back)
src/components/hosts.tsx    option picker, barcode scanner, date picker, toast
src/screens/                home, receipts, put away, orders
```

To change a pattern everywhere, edit the shared components rather than the screens. This follows the same rule as the design's `VaultUI` file.

## Checks

```bash
npx tsc --noEmit
npx expo-doctor
```
