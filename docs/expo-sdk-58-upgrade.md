# Expo SDK 58 upgrade (FITZ-20)

## Dependency and configuration migration

The app was upgraded incrementally with Expo's own compatibility tool:

```sh
pnpm --filter @fitzindustries/expo exec expo install 'expo@^55.0.0' --fix --pnpm
pnpm --filter @fitzindustries/expo exec expo install 'expo@^56.0.0' --fix --pnpm
pnpm --filter @fitzindustries/expo exec expo install 'expo@^57.0.0' --fix --pnpm
pnpm --filter @fitzindustries/expo exec expo install 'expo@^58.0.0' --fix --pnpm
```

Expo cannot write this app's dynamic TypeScript configuration automatically. Required `expo-status-bar` and `expo-sqlite` plugins were added manually after the CLI requested them. Removed obsolete `newArchEnabled`, Android `edgeToEdgeEnabled`, `reactCanary`, and legacy asset-bundle configuration. Kept the web app client-only via `web.output: "single"` rather than adopting SDK 58 Router's new server-output default.

Current baseline:

- Expo `58.0.25`, Expo Router `58.0.31`, React Native `0.88.1`.
- Shared React/React DOM catalog `19.3.0`, matching Expo's recommendation; matching React types remain centralized. Root React type dependencies support libraries whose own manifests do not declare those type peers.
- Expo native packages, Reanimated, Worklets, Gesture Handler, Screens, and Safe Area versions selected by Expo tooling, not independently upgraded to npm latest.
- Explicit `expo-sqlite`, `@expo/metro-runtime`, `@expo/dom-webview`, and `react-native-web` dependencies prevent incompatible implicit peers.
- TypeScript remains the repository catalog version `6.0.3`; Expo also recommends this version on SDK 58.
- The app inherits Expo's tsconfig defaults, including the `react-native` resolution condition, while retaining the repository's strictness and explicit `expo/types` reference for clean CI checkouts.
- Metro uses Expo's monorepo/cache defaults with the existing NativeWind wrapper. Removed the undeclared/transitive `metro-cache` import.
- Storage is split into `storage.native.ts` (Expo SQLite) and `storage.web.ts` (IndexedDB). Web no longer imports Expo SQLite's WASM worker through a platform check inside a shared file.

NativeWind remains on the existing v5 preview; no unrelated styling-framework migration was performed. Native runtime behavior still requires a device validation.

## Verification commands

Use the pinned Node and pnpm versions. Do not use real API credentials for bundle checks.

```sh
pnpm --filter @fitzindustries/expo exec expo install --check
cd apps/expo && pnpm dlx expo-doctor@1.21.8
```

Expo Doctor passed all 20 checks. A stale incremental TypeScript cache initially retained obsolete React declaration errors after dependency relinking; a nonincremental check passed, and generated compiler caches were cleared before a forced monorepo typecheck. No source casts or suppressed type errors were introduced.

Bundle validation (this is **not** a native build or device launch):

```sh
CI=1 EXPO_NO_DOTENV=1 pnpm --filter @fitzindustries/expo exec expo export \
  --platform ios --platform android --platform web --output-dir .cache/sdk58-export
```

Android and iOS Hermes bundles and the web bundle generated successfully. The export is gitignored. Running a standalone web export requires explicit `EXPO_PUBLIC_API_URL` and `EXPO_PUBLIC_ZERO_CACHE_URL`; a static export has no Expo dev-server host discovery.

Native-project configuration was also generated in a disposable copy under `/tmp` with `expo prebuild --no-install`. Both Android and iOS projects generated successfully. No generated native directories were created or committed in the application checkout; no CocoaPods/Gradle compilation was performed.

Existing root lint, typecheck, format, unit/coverage, workspace validation and web build checks must remain green because React is shared with the web app and UI package.

## SDK changes relevant to subsequent testing

- React Native 0.88 uses the strict TypeScript API; do not add legacy deep imports or opt out merely to silence errors.
- New Architecture is the baseline. Regenerate development builds; SDK 54 binaries cannot run this SDK 58 project.
- SDK 56+ requires iOS 16.4 or newer; use the SDK 58-compatible Xcode/iOS SDK when building.
- SDK 56 changes the default fetch implementation. Recheck Better Auth cookies and Zero networking on a real device.
- SDK 58 controls `NODE_ENV` based on the Expo command. Do not rely on `NODE_ENV=test` to select a test environment file.
- Expo Router APIs changed across these releases; the existing Stack/router usage compiled and bundled, but navigation must still be exercised natively.

## Native validation still required

FITZ-50 tracks actual device/emulator checks: build and launch Android/iOS, login/logout and Secure Store, Zero SQLite initialization, a persisted optimistic write, app restart, background/foreground, offline/reconnect and session isolation. This Linux VM has no configured Android emulator/SDK or iOS/Xcode toolchain. No EAS builds were launched and no Expo/Apple/Google credentials were requested or stored.

Do not describe bundle generation or prebuild as a passing native build. FITZ-20 must remain open for its native-start acceptance criteria unless that scope is explicitly split into FITZ-50 by the operator.

## References

- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://expo.dev/changelog/sdk-55
- https://expo.dev/changelog/sdk-56
- https://expo.dev/changelog/sdk-57
- https://expo.dev/changelog/sdk-58
