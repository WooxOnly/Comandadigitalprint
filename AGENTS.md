This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Permanent BistroHub requirements

- Every user-facing feature must ship in Brazilian Portuguese, English and Spanish in the administrative portal, Manager Dashboard and APK. Use the existing translation catalogs, including validation, errors, accessibility labels and receipts. Preserve user-entered names and notes.
- Review spelling, accents, punctuation and restaurant terminology in all three languages. Keep sources in UTF-8. New translation keys require both English and Spanish values; run the language coverage tests.
- Language selectors use bundled flag images for Brazil (Portuguese), the United States (English), and Spain (Spanish). Keep the language names as accessibility labels and expose the selected state; do not depend on emoji rendering. Keep the selector at the upper right, with discreet 20 × 15 flag images, 44 × 44 touch targets and a light selected background with a thin green border. Include the tablet sign-in, initial linking and unlocked Settings screens. Do not show the language selector on protected Settings access: within Settings it is available only after the hourly password is verified.
- Verify tablet portrait and landscape layouts, including rotation with a draft, large fonts, long names, keyboard access, forms, navigation and receipt dialogs. Run the responsive browser checks; distinguish browser/emulated evidence from Android device validation.

- Kitchen Display shows six queued orders at once on the target 11-inch tablet: 3 × 2 in landscape and 2 × 3 in portrait. Sort by the actual order emission instant, never sync arrival or preparation update time. Details expose all items, flavors, extras and notes. Kitchen reprint is an opt-in per-store portal policy in addition to user reprint permissions; authorize on the server before preview and again before sending. Keep it manual and preserve the order/preparation state.
- In store administration, keep the Cash Management module switch together with its settings. Tax and manager fields are disabled unless that form has Cash Management enabled. Preserve saved settings when disabling the module; do not submit inactive settings.
- Store settings use Save and Undo actions, enabled only while the form differs from its loaded saved values. Undo restores all fields and dependent disabled states locally without writing to the server. Keep both actions disabled during saving; failed saves retain the draft.
- Web portal account passwords require at least 8 characters; user-chosen tablet passwords may use any nonempty length up to the existing 128-character input limit. Keep confirmation, hashing and authorization. API signing secrets are separate.
- The owner portal enters through Home and has global Home, Clientes, Gerenciar senhas, Minha conta and Sair navigation. The weekly system-administrator app password and hourly Settings code are global across all customers/groups/stores; their management never requires choosing a store. Preserve the legacy default-store rotation row as the global revision to avoid changing its current password. Customer passwords are separate: app users remain store-scoped and Customer Portal accounts remain customer-scoped. Each customer is either a single location or a group of locations, with no mandatory organization above a group. Then choose a store explicitly; logs, history and store settings belong inside that store, and account password management stays global. Preserve existing group IDs and manager memberships. Manager metrics remain in the separate customer Manager Dashboard.
- Owner portal login and initial tablet linking allow the first five failed attempts without a wait. The sixth failure waits 30 seconds, the ninth 60, the twelfth 90, adding 30 seconds per three additional failures. A successful login clears the counter; requests during a wait neither count nor extend it.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
