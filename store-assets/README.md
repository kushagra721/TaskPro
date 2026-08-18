# Store graphic assets — Task Pro

Ready to upload: **`out/`**

| Store | Files | Size |
|---|---|---|
| Play — feature graphic | `feature-graphic.png` | 1024×500 |
| Play — phone | `phone-01…08.png` | 1080×1920 |
| Play — tablet | `tablet-01…04.png` | 1920×1200 landscape |
| **App Store — 6.9"** | **`ios-69-01…08.png`** | **1320×2868** |
| **App Store — 6.1"** | **`ios-61-01…08.png`** | **1179×2556** |

The two App Store sets are the **same eight captures with the same headlines**
as the Play phone set — see "One composition, three canvases" below for why they
are rebuilt rather than resized.

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

## One composition, three canvases

The App Store assets are **not resized Play assets**, and they cannot be. Play's
phone frame is 1080×1920 — 0.563 wide-over-tall — against the App Store's
1320×2868 (0.460) and 1179×2556 (0.461). Scaling the Play PNG up by width leaves
roughly 520px of dead canvas below the device; scaling it by height crops the
sides off. Either one looks like a mistake.

So `build.mjs` rebuilds the composition at each canvas from the **proportions
the Play asset already uses** — `PLAY_BANDS`, the share of the leftover space
that the top padding, the copy block and the device gap each take, measured off
the 1080×1920 original. The result reads as the same asset at a different size
rather than a stretched copy.

## The App Store set is in a real iPhone frame

The Play assets sit in a generic dark slab. The App Store ones are an iPhone —
titanium rails with a machined-edge highlight, a black bezel ring, the iPhone's
much rounder display corner, side buttons, a Dynamic Island and a home
indicator. `IPHONE` in `build.mjs` holds the geometry as fractions of the screen
width, taken from iPhone 16 Pro dimensions (402×874pt screen, 55pt display
corner, 125×36pt island, ~62pt status bar, 139×5pt home indicator). Fractions,
not pixels, so the 6.9" and 6.1" frames are the same handset rather than one
looking chunkier than the other.

That forces one structural difference from the Play build: **the glass is three
bands, not one image.** An iPhone has chrome above and below the app, so the
screen is `status / app / home`. The Android status bar was cropped away at
capture time, which leaves the top band empty — and this is why `topBg` exists.

- **`topBg` is measured per shot, not chosen.** It is the median of the
  capture's own pixel row at the crop line, so the band continues the app's
  header instead of showing a seam. Login and the chat view genuinely differ
  from the rest (`#E0E3FA` and `#EBEDFA` against `#F9FAFE`), so one shared value
  would have seamed on two of the eight.
- **`IOS_HOME_BG` is a single constant** because the bottom row measured
  `#F6F6F6` with *zero* horizontal variation on all eight shots. Using `topBg`
  there — which the first version did — left a visible line under the app's nav
  bar.
- Both seams are verified numerically after rendering, not by eye: every one of
  the 16 files matches to within 1/255 on both edges.
- **The Dynamic Island sits in the status band and never covers app UI.**
  Overlaying it on the capture instead would have hidden the avatar and name in
  the app's own header.
- The status bar glyphs and the time are **drawn**, like the frame around them —
  device chrome, not app UI, so this does not break the "nothing here redraws
  the app" rule that the captures themselves follow. 9:41 is Apple's own
  convention in its marketing.

⚠️ `IOS_CSS` **must null `.device`'s background and shadow.** The shared `CSS`
gives `.device` a dark navy gradient with no radius of its own — that rule *is*
the frame for Play, but here `.device` is only a positioning box for the rail
and buttons, so it renders as a square dark wedge behind every rounded corner.
It shipped that way once and is only visible if you zoom into a corner.

Two more details are load-bearing:

- **Type scales with WIDTH, not height** (`k: n => n * canvasW / 1080`). Scaling
  it by height would put a 100px headline on a canvas no wider than Play's, and
  every headline would rewrap.
- **The device ceiling is on width** (0.70 of the canvas, against Play's 0.617).
  These canvases are narrower relative to their height, so the phone can take a
  larger share and still keep its side margins — capping on height instead would
  let it crowd the edges.

Both App Store sizes are **native pixel counts** (@3x and @2x of the 6.9" and
6.1" point sizes). App Store Connect rejects anything off by a pixel, so do not
round them.

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
