# Play Store graphic assets — Task Pro

Ready to upload: **`out/`** — 1 feature graphic (1024×500), 8 phone (1080×1920)
and 4 tablet (1920×1200 landscape) PNGs.

| File | Screen | Headline |
|---|---|---|
| `feature-graphic.png` | Chats + Dashboard | Tasks, channels and chat in one workspace. |
| `phone-01.png` | Dashboard | Your workspace, at a glance |
| `phone-02.png` | Dashboard charts + open tasks | See where the work stands |
| `phone-03.png` | Hub → Groups | Every channel, with its progress |
| `phone-04.png` | Channel (Tasks / Members / Chat) | Tasks, people and chat — in one channel |
| `phone-05.png` | Chats list | All your team chats, in one list |
| `phone-06.png` | Conversation | Reply, react, stay in context |
| `phone-07.png` | Reports | Reports that show who did what |
| `phone-08.png` | Sign in | Sign in with a password or a code |
| `tablet-01.png` | Hub → Groups | The same app, more room |
| `tablet-02.png` | Chats, two-pane | Chat list and conversation, together |
| `tablet-03.png` | Hub → Clients Space | Projects, channels and client spaces |
| `tablet-04.png` | Channel task table | A full table, not a narrow list |

## Where the captures came from

Signed in as **vivek@dialerp.com (OWNER of DialErp)** — 27 members, 8 channels,
206 tasks. The device's previous session (`kushagra`, MEMBER) had 2 channels and
2 chats, which left half of every screen empty, and its newest task titles were
"test noti" / "testing".

- **Phone** (`raw/0*.png`, `raw/1*.png`) — real screenshots pulled off the
  connected device running the installed `com.taskpro.app` build.
- **Tablet** (`raw/t*.png`) — the **same build**, rendered at a 1280×800 tablet
  viewport in Chrome rather than captured from the device. Two reasons, both
  worth knowing:
  1. `.sidebar` has no `env(safe-area-inset-top)` rule in the native app, so at
     tablet width the "Task Pro" brand and part of the **Home** nav item sit
     underneath the status bar. That is a real bug — see below.
  2. Headless Chrome does not render recharts at all (`ResponsiveContainer`
     measures zero and never receives a resize), so any chart screen has to be a
     device capture. Both chart screens here — `phone-02`, `phone-07` — are.

`build.mjs` writes one HTML composition per asset; `render.mjs` screenshots each
at its exact pixel size with headless Chrome:

```
node build.mjs && node render.mjs
```

## Rules the compositions follow

- The app UI is the untouched capture. No colours, type, icons, labels, layout
  or navigation were altered, and no screen was redrawn.
- The only crop is the **Android status bar** off the top and the **system
  navigation bar** off the bottom of the phone captures, so the frame holds app
  UI only. The app's own bottom navigation is fully visible. Tablet captures
  have no OS chrome and are uncropped.
- Every headline describes something visible in the shot beneath it. No invented
  statistics, no claimed features, no numbers that are not on screen.
- The logo in the feature graphic and the brand line is `public/favicon.svg`,
  copied verbatim.
- No browser chrome, no localhost, no dev tooling, no watermark.

## Bug found while capturing — worth fixing before release

**The sidebar is clipped by the status bar at tablet width.** `global.css`
applies `env(safe-area-inset-top)` to `.topbar` and `.chat-pane__header` under
`.native-app`, but not to `.sidebar`, which only renders above 900px. On a phone
nothing shows it; on a tablet the brand row and the top of the **Home** item
disappear behind the status bar, in both portrait and landscape.

It is a one-rule fix in the `.native-app` block, but it needs an APK rebuild to
verify, and the Android Studio JBR on this machine is broken (`jbr/lib/` has
lost `jvm.cfg`, and the only other JDK is 17 where Gradle needs 21). Not applied
here — flagged rather than silently changed.

## Two things to check before you upload

1. **Real people and real customers are on screen** — Vivek Gupta, kushagra,
   Abhinandan, Ashu, Avnish, Hemanta and their avatars; the workspace name
   DialErp; and on `tablet-03` a list of client spaces including third-party
   company names (`Jyoti Inox Pvt Ltd`, several `*.dialerp.in` tenants,
   `Kamdhenu Aviation`). You chose to leave names visible, which is normal for a
   B2B listing — but a Play listing is public and permanent, so confirm the
   third-party client names in particular are fine to publish.
2. **A few real task titles carry typos** the team typed — "handel", "ladger",
   "clinet" — visible on `phone-02`. These are your users' words, not listing
   copy, and were not edited. Fix them in the app if you would rather they
   didn't appear, then re-capture.

## Captures kept but not used

`raw/` also holds the workspace-wide Tasks list and the Hub Projects tab. Both
lead with the newest tasks, which are currently "test noti" and "testing" — the
channel-scoped list (`phone-04`) shows the same feature with real work in it.
