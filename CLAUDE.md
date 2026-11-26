# Taskaya (تاسكاية) — project rules for Claude

The user speaks Egyptian Arabic: reply in Egyptian Arabic, keep code/commands/commits in English. Explain each change simply and say where it shows: 🎨 screen / ⚙️ logic / 🗄️ database / 🔧 tooling. Don't commit before the user confirms a change works; then commit + push with a clear `feat:/fix:/style:` message.

## Repo + run
- Project in `taskaya/`. `apps/customer`: Expo SDK 58, RN 0.88, React 19.3, Expo Router (`src/app`), TS, React Compiler. One app for customers AND providers (role-based). Dev: `npx expo start --tunnel ngrok` (+`-c` after package changes). Install packages with `npx expo install`. Typecheck: `npx tsc --noEmit`. APK: `npx eas-cli build -p android --profile preview`.
- `apps/admin`: Vite + React 19 + react-query + supabase-js, Arabic RTL, CSS vars (`index.css`), Lucide icons via `<Ico e="emoji">`. Deployed on Cloudflare Workers on push. Dev: `npm run dev`.
- Supabase: migrations in `supabase/migrations/` (numbered). Edge Functions: `send-push` (deploy with `--no-verify-jwt`), `create-provider`, `manage-staff`.

## Rules that must not be undone
- Android: no `elevation` on translucent views; never restyle a TextInput's parent on focus (use an absolute ring layer); no opacity entrance animations.
- RTL: `src/i18n` (`lang`, `isRTL`, `tr(ar,en)`, `layoutRTL()`); native I18nManager forced LTR; direction comes from styles. On web use `writingDirection`, not `direction`.
- Theme: 5 accents (Lava Blue `#1F5BFF`, burgundy, violet, gold, pink); light bg `#F4F6FA`; navy `#0B1B3F`. Brand text always "TASKAYA".
- Screens are transparent (star background). `(app)/_layout` wraps screens in `HideWhenBlurred`; `components/AppTabs.tsx` has `animation:'none'` + `HideInactiveTab`.
- NEVER navigate from a stack screen (e.g. /inbox) straight to a tab route (builds a second copy of the tabs). Use `setPendingNav({tab, params}); router.back()`.
- SVG gradient ids must be unique per instance (`useId`).
- No Supabase Realtime or polling (server cost). Catalog changes use `app_meta.catalog_version`. Inbox read-state lives on the device.
- Never put service_role in the browser. Admin = `profiles.role='admin'` + `staff_can(section, edit)`.
- Booking updates guarded by `guard_booking_update`; prices only via `send_quote`/`answer_quote`; provider actions via `provider_set_status`.

## Next
1. Bell for the provider app + provider push texts (url /pro/requests).
2. Restyle verify / settings / addresses + provider screens.
3. New APK (icon, intro, inbox, push logic, version in settings), then test push on device.
