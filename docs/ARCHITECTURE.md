# Overcomer’s Library: where it is and where it should go

_Assessment written 2026-10-16. Goal: ship to the App Store and Google Play, with either book purchases or a subscription._

## 1. What exists today

| Piece | How it works now |
|---|---|
| UI | 5 Claude Design designs, exported as "standalone HTML" bundles: library home, book (served 3× as covenant / jcfp / weekly), reader (`read/`), Bible, admin console |
| Runtime | Each page is a 0.7–2.6 MB HTML file containing base64 React 18 UMD, the Claude Design `dc-runtime`, fonts, images and data. On every page load it unpacks itself into `blob:` URLs |
| Hosting | GitHub Pages, public repo, PWA with a hand-written service worker (`site/sw.js`) |
| Backend | Supabase `gra-prayerbook`: email/OAuth auth, 11 tables with RLS, 12 RPC functions, no edge functions |
| Content | Prayer books are static JSON in `site/` *and* embedded in the bundles; admins publish edits as versioned JSON (`book_versions`, `lib_versions`) |
| Access | `members` table. You join by entering one shared registration code (`redeem_code`), or use the device-only "guest" unlock |

### What's good
- The product is well designed: offline reading, notes and ink, highlights, TTS, reminders, three languages, a draft/publish admin workflow, and privacy-friendly anonymous usage counts.
- RLS is enabled on every table and the RPCs check the caller's role. This is a sound base.
- Supabase is the right backend to keep. Postgres, auth, storage and edge functions cover everything a store app needs.

### What needs fixing

**Security and integrity (fix before charging money)**
1. **The paywall can be bypassed.** "Guest" unlock compares the code's SHA-256 in the browser and writes the hash to `localStorage`. The hash ships in the page, so anyone can set that key. All book content is also in public JSON (`site/prayers.json`, `jcfp.json`), so paid content is freely downloadable today.
2. **The registration code's hash is published** in a public repo and in every page. If the code is short or a word, it can be guessed offline.
3. **Apple won't accept a code-unlock as an iOS paywall.** Guideline 3.1.1 forbids unlocking content with your own codes or keys. See §3.

**Engineering**

4. **The design tool is the source code.** No modules, types, tests or code review. React and the fonts are duplicated in all 7 pages (about 9.5 MB in total, and covenant/jcfp/weekly are identical 1.27 MB files). Every change means re-exporting, and you can't see what changed without unpacking (now handled by `design/src/`, see below).
5. **The schema drifted.** The SQL was pasted by hand with no history. The `translations` table in the file was never applied to production. The `translate` edge function (DeepL) that the i18n code calls does not exist, so French and Spanish fall back to the static `i18n-*.json`. *Fixed in this bootstrap:* the schema is now in `supabase/migrations/`, and the missing table is a pending migration.
6. **Membership is a single yes/no flag.** You can't express "owns book X", "subscribed until date Y" or "access granted by the church". A marketplace needs this.
7. **Supabase security advisor warnings.** `touch_updated_at` has a mutable `search_path` (a migration fixing it is pending). Leaked-password protection is off. The other warnings (SECURITY DEFINER RPCs callable by signed-in users) are intentional, because each one checks the caller's role itself.

## 2. Options for the app

| | A. Wrap the current bundles in Capacitor | **B. Vite + React + TypeScript app, Capacitor for stores** | C. Expo / React Native rewrite | D. Flutter or native Swift + Kotlin |
|---|---|---|---|---|
| Time to first store build | ~2–3 weeks | ~6–10 weeks | ~10–16 weeks | ~16+ weeks |
| Reuses existing work | All of it, as is | The design code is ported almost line for line (it is already React) | The logic, but every screen is rebuilt in RN primitives | None |
| Keeps the Claude Design loop | Yes, copy and deploy | Yes, the export is diffed and Claude ports the changes into components | Weakly, every design change is a manual translation | No |
| Web/PWA from the same code | Yes | Yes | Partly (Expo web is weaker for long-form reading) | Partly |
| Native feel | WebView | WebView with native plugins (good for a reading app) | Best | Best |
| App Review risk | **High.** A "repackaged website" fails Guideline 4.2 unless you add native value | Low with native IAP, push and offline downloads | Low | Low |
| In-app purchases | RevenueCat Capacitor SDK | RevenueCat Capacitor SDK | RevenueCat RN SDK | RevenueCat Flutter / StoreKit |
| Code you can test and review | No | Yes | Yes | Yes |

**Decision (2026-10-16): B.** Scaffolded in `app/`. The Claude Design handoff package (`design_handoff_gra_prayer_library_expo`) assumes Expo (option C) and specifies Expo modules. Its screen specs, tokens and tablet layouts still apply; map its Expo modules to Capacitor plugins (expo-notifications → @capacitor/local-notifications, expo-speech → a TTS plugin, expo-keep-awake → keep-awake, expo-haptics → @capacitor/haptics).

**Recommendation: B, in stages.** The pages are already React class components, so porting them to typed modules is mostly mechanical. That gives one TypeScript codebase for the web, iOS and Android, keeps the web app (useful for church members on laptops and for "buy on the web" flows), and is the lowest-risk path through App Review. Capacitor 8 is current. Use plugins for local notifications (reminders), StatusBar/SplashScreen, Share, Filesystem (offline book downloads) and RevenueCat.

Choose **C (Expo)** instead only if a truly native feel matters more than the web version and the design-tool workflow. For a reading and prayer app, B's WebView is not a meaningful handicap.

Option A is worth doing only as a throwaway prototype, to put it on your phone sooner. It is not something to submit.

### Proposed layout once you choose B

```
app/                 Vite + React + TS (src/pages, src/components, src/lib/supabase.ts, src/lib/purchases.ts)
app/ios, app/android Capacitor native projects
design/src/          extracted Claude Design source, the reference each port is checked against
supabase/            migrations, edge functions (revenuecat-webhook, translate), seed
site/                current bundles: stays live until each page is replaced
```

## 3. Marketplace: book purchases or a subscription

**Store rules that decide this, whichever model you pick:**
- Digital books and subscriptions used inside the app must be sold through Apple/Google in-app purchase, at a 15% commission under Apple's Small Business Program and Google's first-$1M tier.
- You can't unlock in-app content with your own codes (Apple 3.1.1). The "multiplatform" rule (3.1.3(b)) does allow access bought or granted elsewhere, such as on your website or by the church, *as long as the same items are also sold as IAP in the app*.
- In the US, apps may now link to web checkout. That follows the April 2025 Epic v. Apple contempt order. The commission on those links is still being litigated after the Ninth Circuit's December 2025 decision, so plan for IAP first and treat web checkout as an add-on.

**Build for both models, then decide on pricing.** Use RevenueCat as the purchase source of truth across Apple, Google and web (Stripe). Its webhook calls a Supabase edge function, which writes rows into one table:

```sql
products     (id, kind: 'book' | 'subscription', book_slug, store ids …)
entitlements (user_id, scope: 'book:<slug>' | 'all', source: 'apple' | 'google' | 'stripe' | 'grant',
              expires_at null = forever, revoked_at)
```

Book content then moves out of public JSON into Supabase tables or Storage, readable only by users with a matching entitlement (RLS, or short-lived signed URLs). The church registration code becomes a `grant` source, redeemed on the website rather than inside the iOS app.

**My view on which model:** start with **free weekly prayers and samples, plus one-time book purchases**. That is a simpler review, users understand it, and it fits a small catalogue. Add an "All-access" subscription once there are enough books, or regularly new paid content, to justify recurring billing. The entitlement model above supports both without schema changes.

## 4. Testing before the store accounts exist

| What | How | Needs |
|---|---|---|
| UI, any device | Current PWA on GitHub Pages: "Add to Home Screen" on iPhone and Android | Nothing new |
| Per-change previews | `npm run serve` locally. Optionally a preview URL per PR (Netlify or Cloudflare Pages) | Free tier |
| Schema changes | A **staging Supabase project**, e.g. reuse the inactive "olayori's Project". Apply migrations there first | Free tier |
| iOS app | Capacitor → iOS Simulator, or your own iPhone signed with a free Apple ID (re-sign every 7 days) | **Full Xcode** (only Command Line Tools are installed now) |
| Android app | Android Emulator, or sideload the debug APK onto any phone | Android Studio and a JDK (not installed) |
| Purchases, no store accounts | **RevenueCat Test Store**: real entitlement flow, `test_` API key, Capacitor SDK ≥ 11.2.6 (verify against the live docs). Xcode StoreKit configuration files for local IAP | RevenueCat free tier |
| Purchases, real store sandbox | TestFlight + App Store Sandbox; Google Play internal testing | Apple Developer ($99/yr) and Play Console ($25 once) |

**Account tips:**
- Enroll both stores as an **organization** (the church or ministry), which needs a D-U-N-S number. Apple waives the $99 fee for eligible nonprofits.
- New *personal* Google Play accounts must run a 12-tester, 14-day closed test before they can publish. Organization accounts skip this.
- Start the D-U-N-S and enrollment process early. It often takes weeks.

## 5. Roadmap

1. **Done (this bootstrap):** the repo is an npm project; schema in tracked migrations; design import, extraction and checks; smoke tests; CI that tests before deploying; one-command deploys.
2. **Protect content and add entitlements:** `products` and `entitlements` migrations, content behind RLS or Storage, remove the client-side guest unlock, enable leaked-password protection, then build or remove the `translate` function.
3. **App codebase (option B):** ~~scaffold `app/`~~ (done, with Weekly Kingdom Prayers ported), port the book reader first (the biggest and most-used page), then home, reader, Bible and admin. Retire each `site/` bundle as its page is replaced.
4. **Native:** Capacitor iOS/Android, local notifications, offline downloads, RevenueCat Test Store.
5. **Stores:** developer accounts, sandbox and TestFlight / internal testing, listings and privacy labels, submission.
