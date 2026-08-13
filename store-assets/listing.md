# Google Play listing copy — Task Pro

Every claim below is something the app actually does. If a feature changes,
change its line — nothing here is aspirational.

---

## Short description (80 characters max)

**Use this — 67 characters:**

```
Tasks, channels, chat and reports for your team — in one workspace.
```

Alternates, both within the limit:

```
Team tasks and chat in one workspace, with reports that show the progress.
```
```
Assign work, chat in channels and track progress across your whole team.
```

---

## Full description (4000 characters max — this is ~3,150)

```
Task Pro keeps a team's work and its conversation in the same place. Tasks live in channels alongside the chat about them, so nothing has to be repeated in a second app.

WORKSPACES AND CHANNELS
• Create a workspace, invite your team by email, and switch between workspaces from one menu
• Organise work into channels — each with its own members, its own tasks and its own conversation
• See members, open tasks, message count and a completion bar for every channel at a glance

TASKS
• Title, description, priority, due date, assignee, project and client space
• Open, completed or cancelled — closing a task asks for a remark, so the record says why
• Filter by priority, channel, member, creator, project, client space or date, sort A–Z or newest first, and search by name
• Attach images, video and documents to any task
• A timeline on every task showing each change and who made it, plus notes anyone can add
• Reopen a completed task with a new due date

CHAT BUILT FOR WORK
• A channel conversation for every team, with a WhatsApp-style chat list, search and an unread filter
• Reply to a specific message with the original quoted above your answer
• React with emoji, see when your message has been read, and see when someone is typing
• Edit your own messages; delete for yourself, or for everyone if it is yours
• Day separators, so a long thread stays readable

ATTACHMENTS AND PHOTOS
• Share photos, video and documents in chat and on tasks
• Crop, rotate, draw on, annotate and add stickers to a photo before you send it
• Set a profile photo and a workspace photo the same way

DASHBOARD AND REPORTS
• A home screen with members, channels, open tasks and what is assigned to you
• Tasks created over time, and a breakdown of open, completed and cancelled
• Reports showing that breakdown by channel, by project, by client space and by member — with each one's share of the total
• Look at everything, a single month, or a date range you pick

CLIENT SPACES
• Give a customer their own space, with only their work in it
• A client sees their own tasks and their own channel — not your other customers, your internal channels or your member list
• They can raise a request and your team can pick it up

PEOPLE AND ACCESS
• Owner, admin, member and client roles, applied on the server rather than only in the app
• Invite by email, approve or decline join requests, and change a member's role
• Members see the channels they belong to; admins see the whole workspace

NOTIFICATIONS
• Push notifications when you are assigned work, when a task is closed, when you are invited, and for new messages
• A notification centre in the app for everything that needs your attention

SIGNING IN
• Email and password, or a one-time code sent to your inbox — whichever you prefer
• Set or change your password from your profile

ACCESS
Task Pro is used by teams. Anyone can create a workspace and invite colleagues; joining an existing workspace needs an invitation or an approved request.

Task Pro is powered by Dial ERP.
```

---

## Before you submit

- **Payments are the biggest risk here, and it is worth deciding deliberately.**
  The app opens **Razorpay Checkout in-app** to buy a plan upgrade or a task
  top-up (`hooks/useCheckout.js`, `pages/more/BillingPage.jsx`,
  `ManagePlanPage.jsx`). Google Play's Payments policy requires **Google Play
  Billing** for purchases of digital content that unlock functionality inside
  the app, and a SaaS plan that raises your task quota is squarely that. The
  safe options, cheapest first:
  1. Hide the upgrade/top-up buttons in the **native build only** (`isNativeApp()`
     already exists and is used elsewhere) and leave the pages read-only there —
     the customer manages their plan on the web.
  2. Integrate Google Play Billing for the Android purchase path.
  3. Apply under Play's alternative/user-choice billing programme for India.
  Doing nothing is the option most likely to get the release rejected or the app
  pulled after it is live.
- **Demo credentials are required.** The app is entirely behind a login with no
  usable public entry point for a reviewer. Add a test account under App content
  → App access. `MASTER_OTP` is `0000`, so an email-OTP account works without
  inbox access — but do not put that fact in the public listing.
- **Data safety form.** Task Pro collects, at minimum: name, email address,
  profile photo, user-generated content (tasks, messages, uploaded files), and —
  if billing is used — name, address and GSTIN for invoices. Declare each one,
  and whether it is shared.
- **Privacy policy URL:** https://dialerp.in/privacy — now linked from both the
  marketing footer and the app's More page.
- **Permissions.** The Android build declares `POST_NOTIFICATIONS` (push) and
  reads photos/files for attachments. Both are used on screens a reviewer can
  reach once signed in.
