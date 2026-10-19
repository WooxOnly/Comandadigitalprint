This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Efficiency preferences explicitly confirmed by the owner — 2026-10-17

- After starting an APK build, return its tracking link without monitoring or waiting for completion. Check again only when the owner asks. Stop local monitoring processes without cancelling the remote build.
- Minimize token use and repetitive progress messages. Use targeted tests for the changed behavior and its affected dependencies, reuse valid prior results, and avoid repeating successful tests without a new change or unresolved concern. Use the full suite when cross-cutting changes or a release require it; do not repeatedly run overlapping full suites.
- Publishing credentials are now repository Actions Secrets, independent of the temporary workspace login. Do not ask to recreate working credentials; investigate a concrete authentication failure before requesting setup. Never request credential values in chat.

## Publication authorization — updated 2026-10-19

- The owner explicitly authorized publishing all implemented changes ("Ok, pode publicar tudo que fizemos"). Deliver to homologação only; production remains outside scope. The approved but unimplemented Order layout preview is not part of the code delivery. If publication permission is revoked again, stop further deployments/APK delivery until explicit authorization. Start the APK build and return its tracking link without monitoring it.

## Permanent BistroHub requirements

- Every user-facing feature must ship in Brazilian Portuguese, English and Spanish in the administrative portal, Manager Dashboard and APK. Use the existing translation catalogs, including validation, errors, accessibility labels and receipts. Preserve user-entered names and notes.
- Review spelling, accents, punctuation and restaurant terminology in all three languages. Keep sources in UTF-8. New translation keys require both English and Spanish values; run the language coverage tests.
- Language selectors use bundled flag images for Brazil (Portuguese), the United States (English), and Spain (Spanish). Keep the language names as accessibility labels and expose the selected state; do not depend on emoji rendering. Keep the selector at the upper right, with discreet 20 × 15 flag images, 44 × 44 touch targets and a light selected background with a thin green border. Include the tablet sign-in, initial linking and unlocked Settings screens. Do not show the language selector on protected Settings access: within Settings it is available only after the hourly password is verified.
- Verify tablet portrait and landscape layouts, including rotation with a draft, large fonts, long names, keyboard access, forms, navigation and receipt dialogs. Run the responsive browser checks; distinguish browser/emulated evidence from Android device validation.
- Home shortcuts and bottom navigation share one module list. Preparation, scheduled orders, customer registry and Cash Management have bundled offline icons and appear in both places only when enabled. Select the correct parent tab for nested history, cash reports and backups; keep the active tab visible and use horizontal scrolling on narrow displays without shrinking touch targets or breaking the responsive KDS layout.
- App users have exactly four profiles, editable in the app's protected Settings and the owner's customer-access page: Admin (all active functions), Manager (everything except Settings/backups), Cashier (Home/order/history/preorders/customer registry/Cash), Cook (only Kitchen Display, including a logout action). Module flags still gate optional functions. Enforce profiles in routes, local writes, server reads/writes and cash reports; never rely on hidden buttons. Keep the reserved weekly `admin` account protected. Missing legacy profiles default to Cashier without changing credentials; unknown profiles fail closed. App Admin never grants owner-portal or Customer Portal sessions; those remain separate accounts and cookies.

- Preparation correction is fully offline using cached active users, password verifiers and permissions. The operator who performed the last change may undo within 60 seconds without additional credentials. Later/different corrections are direct when the logged-in user has permission; otherwise require another cached authorized user's password, verified locally without changing the session. Admin/Manager always authorize; other users need `correctPreparation` (default off). Never store approval passwords. Persist signed correction history and its prerequisite changes before showing success; synchronize in order later. Conflicts/revocations on reconnection preserve the local audit and require review rather than overwriting remote changes. Network availability never gates a local correction.
- Kitchen completion has an owner-controlled per-store “Utilizar o botão finalizar no fluxo de preparo” policy, enabled by default for compatibility. Enabled retains Ready → Finish as handoff confirmation; disabled completes on Ready, preserving ready/completed timestamps and actor audit. Sync/cache it independently of role permissions and authorize server writes. Scheduled-order operational flow remains deferred.
- Kitchen Display shows twelve queued orders on the target 11-inch tablet in landscape (4 × 3) and eight in portrait (2 × 4). Short landscape windows retain eight cards rather than shrinking fixed controls. Swipe left/right changes pages; vertical item scrolling and Details must remain independent. Rotation keeps the previously visible order on screen. Use compact cards with wrapping text instead of ellipses; long item lists scroll inside each card while its action buttons stay visible. Sort by the actual order emission instant, never sync arrival or preparation update time. Details expose all items, flavors, extras and notes. Kitchen reprint is an opt-in per-store portal policy in addition to user reprint permissions; authorize on the server before preview and again before sending. Keep it manual and preserve the order/preparation state.
- In store administration, keep the Cash Management module switch together with its settings. Tax and manager fields are disabled unless that form has Cash Management enabled. Preserve saved settings when disabling the module; do not submit inactive settings.
- Store settings use Save and Undo actions, enabled only while the form differs from its loaded saved values. Undo restores all fields and dependent disabled states locally without writing to the server. Keep both actions disabled during saving; failed saves retain the draft.
- Customer Portal login uses normalized e-mail addresses, not operator usernames. Owner registration offers a manual password or a one-use, 24-hour email invitation with password confirmation. Support resend, explicit delivery failures, CSRF/rate limits and revocation on account/client/email/password changes. Preserve existing account IDs, credentials and store grants when adding a real email to legacy records; never invent an email. Tablet/operator accounts stay separate. Invitation tokens are hashed at rest and kept out of query strings, browser storage, logs and owner responses. Apply the additive invitation schema before publishing the Worker. Real delivery requires the configured provider/from address; synthetic-provider tests do not prove inbox delivery.
- Web portal account passwords require at least 8 characters; user-chosen tablet passwords may use any nonempty length up to the existing 128-character input limit. Keep confirmation, hashing and authorization. API signing secrets are separate.
- Inside each customer, expose separate “Cadastro do cliente”, “Usuários App” and “Usuários Painel do gestor” navigation. Customer registration edits only customer details/store membership, tablet users require an explicitly selected store, and portal users are customer-scoped email accounts/invitations. Never combine these forms or hide portal users inside a mixed “Cadastro e usuários” page. Preserve old app-user bookmarks by mapping `#client-password` to `#app-users`.
- The owner portal enters through Home and has global Home, Clientes, Gerenciar senhas, Minha conta and Sair navigation. The weekly system-administrator app password and hourly Settings code are global across all customers/groups/stores; their management never requires choosing a store. Preserve the legacy default-store rotation row as the global revision to avoid changing its current password. Customer passwords are separate: app users remain store-scoped and Customer Portal accounts remain customer-scoped. Each customer is either a single location or a group of locations, with no mandatory organization above a group. Then choose a store explicitly; logs, history and store settings belong inside that store, and account password management stays global. Preserve existing group IDs and manager memberships. Manager metrics remain in the separate customer Manager Dashboard.
- Owner portal login and initial tablet linking allow the first five failed attempts without a wait. The sixth failure waits 30 seconds, the ninth 60, the twelfth 90, adding 30 seconds per three additional failures. A successful login clears the counter; requests during a wait neither count nor extend it.

- Appearance selectors use sun/moon icons, without visible Light/Dark text, at the upper right on all app screens and portal pages. Preserve localized accessibility names and at least 44 × 44 touch targets. Show the localized slogan “BistroHub — Do caixa à cozinha.” consistently in shared headers.
- Light/dark appearance is available without permissions on app entry/linking and Home, and always visible in a sticky toolbar on every administrative/customer portal page, including login and recovery. Persist the explicit choice locally per device/browser, use the OS color scheme initially, preserve drafts and sessions, and keep printed receipts on white paper. Cover native screen/inline styles and dialogs, not just the page background. Keep all appearance labels in PT-BR/EN/ES. Presentational native components in screens/ui use `ThemedNative` so shared and inline styles receive the semantic palette; `AppearanceContext` imports the actual native module to avoid a cycle. Appearance is a local preference, outside cloud roles and store module flags.

- Monthly licenses belong to the customer registration, independent of operator profiles and module flags. Only the owner portal changes validity, automatic monthly renewal or blocking. The tablet checks daily and keeps operating offline until its last signed expiration; network failure alone never blocks a valid license. Never-verified or expired devices require a successful check or a signed, device/store/environment-bound temporary authorization with an absolute deadline. The first store-linking screen also supports that authorization. A successful server check replaces the temporary grant. Keep license proofs and clock/device identity in SecureStore outside business backups; preserve drafts when the license gate closes. Enforce blocked/expired licenses on operational cloud APIs too. The signing private key belongs only in the Worker secret, never the repository/APK/EAS; the corresponding public key is bundled. Apply the additive license schema and configure the matching signer before shipping an APK. Document offline blocking latency and distinguish native Android validation from Node/WebCrypto and browser fixtures.

- Exception explicitly requested by the owner: scheduled-order cancellation uses a `cancelPreorders` permission on each Cashier record (default off). Admin and Manager always authorize it; Cook cannot access scheduled orders. Cancellation requires fresh selected-user credentials, server-side authorization and audit without changing the operator session or storing passwords. Preparation correction has its own explicitly approved `correctPreparation` permission (Admin/Manager always authorize). All other app permissions are defined exclusively by the four profiles in each individual user record. Do not render or enforce per-user action checklists or a separate Cash manager list. Legacy access/manager data remains for compatibility/rollback but must neither grant privileges nor restrict the selected profile. Only Admin and Manager authorize discounts, price overrides, reversals and financial reports. Store module flags, license status and the kitchen reprint opt-in remain independent requirements.

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
