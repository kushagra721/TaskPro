import { isNativeApp } from '../utils/native.js';
import { notificationsApi } from '../api/client.js';

/**
 * The Android push lifecycle: permission, token, listeners, teardown.
 *
 * WHY `@capacitor/push-notifications` RATHER THAN THE FIREBASE SDK DIRECTLY
 * This app's UI is a WebView. A hand-written `FirebaseMessagingService` would
 * have to bridge every message back into JavaScript itself, and would fight the
 * plugin over which one owns the FCM token callback. The plugin already does
 * exactly that bridging, and it is what `google-services.json` and the Gradle
 * plugin (both already present) are wired for.
 *
 * WHAT ANDROID DOES WITH A MESSAGE, WHICH DECIDES THE HANDLERS BELOW
 *   app in FOREGROUND  → no system notification; `pushNotificationReceived`
 *                        fires and it is up to us what to show.
 *   app BACKGROUNDED   → the system draws the notification. Nothing runs in JS
 *   app KILLED           until the user taps, which fires
 *                        `pushNotificationActionPerformed` — on a cold start
 *                        that arrives *after* the app has booted, which is why
 *                        the tap handler navigates rather than assuming a route
 *                        was already set.
 *
 * Everything is dynamically imported so the web bundle never loads the plugin,
 * and every entry point is a no-op off-native.
 */

/** Registered listener handles, so a sign-out can detach them. */
let listeners = [];
let registered = false;
let onNavigate = null;
/** A tap that arrived before the router was ready (cold start from a tap). */
let pendingRoute = null;

/**
 * The plugin, wrapped in a plain object — deliberately.
 *
 * A Capacitor plugin is a **Proxy that turns any property access into a plugin
 * method call**. Returning it straight out of an `async` function means the
 * runtime awaits it, which reads `.then` off the proxy, which Capacitor
 * dispatches to native as a method named `then`. On device that produced:
 *
 *     Uncaught (in promise) Error: "PushNotifications.then()" is not
 *     implemented on android
 *
 * — thrown before any listener was attached, so the token was issued and
 * immediately dropped ("No listeners found for event registration" in logcat)
 * and the permission prompt never appeared. Wrapping it means the awaited value
 * is an ordinary object and the proxy is only ever reached through `.api`.
 *
 * Cached so repeated calls do not re-resolve the dynamic import.
 */
let pluginRef = null;
const plugin = async () => {
  if (!pluginRef) {
    const mod = await import('@capacitor/push-notifications');
    pluginRef = { api: mod.PushNotifications };
  }
  return pluginRef;
};

/**
 * Ask for permission, resolving to whether we may show notifications.
 *
 * On Android 12 and below this returns granted without a prompt. On 13+ it
 * shows the system dialog — once. A user who declines is never re-prompted by
 * Android, so this must not be treated as a retryable failure: the app simply
 * has no push, and everything else keeps working.
 */
export const ensurePermission = async () => {
  if (!isNativeApp()) return false;
  try {
    const { api } = await plugin();
    let status = await api.checkPermissions();
    if (status.receive === 'prompt' || status.receive === 'prompt-with-rationale') {
      status = await api.requestPermissions();
    }
    return status.receive === 'granted';
  } catch (err) {
    console.warn('[push] permission check failed:', err?.message);
    return false;
  }
};

/**
 * Creates the notification channel the backend's messages name.
 *
 * Android drops a message whose `channelId` does not exist on the device, with
 * no error anywhere — the send succeeds, nothing appears. The id here MUST stay
 * in step with `FCM.androidChannelId` in the backend config and with
 * `default_notification_channel_id` in AndroidManifest.xml.
 *
 * Importance HIGH is what produces a heads-up banner and a sound; a channel's
 * importance can only be lowered by the user afterwards, never raised by us,
 * so it is set correctly at creation.
 */
const ensureChannel = async () => {
  try {
    const { api } = await plugin();
    if (!api.createChannel) return; // iOS has no channels
    await api.createChannel({
      id: 'taskpro_default',
      name: 'Task Pro',
      description: 'Tasks, chat and reminders',
      importance: 5, // IMPORTANCE_HIGH — heads-up banner
      visibility: 1, // VISIBILITY_PUBLIC — shows on the lock screen
      lights: true,
      vibration: true,
    });
  } catch (err) {
    // A device that refuses the channel still receives the app's other
    // functionality; the failure is worth a line in the log, not a crash.
    console.warn('[push] could not create the notification channel:', err?.message);
  }
};

/**
 * Sends the device token to the backend, which stores it against the
 * authenticated account.
 *
 * Called on first registration AND on every refresh — FCM rotates a token when
 * the app is restored to a new device, when app data is cleared, and
 * occasionally on its own. The backend upserts, so re-sending an unchanged
 * token is harmless and keeps `fcmTokenUpdatedAt` fresh.
 */
const syncToken = async (token) => {
  try {
    await notificationsApi.registerToken({
      token,
      platform: 'android',
      // Diagnostics only. Never used to route anything.
      appVersion: import.meta.env.VITE_APP_VERSION || undefined,
    });
    console.log('[push] device token registered');
  } catch (err) {
    // A failed sync is recoverable: the next app start registers again. It must
    // never surface to the user, who did not ask for any of this.
    console.warn('[push] could not register the device token:', err?.message);
  }
};

/**
 * Where a notification should take the user.
 *
 * `clickAction` is the route the backend computed from the entity — one source
 * of truth for web and phone. The entity fallbacks exist for older app builds
 * receiving a newer payload, and for anything that ever sends a bare type.
 */
export const routeFor = (data = {}) => {
  if (data.clickAction) return data.clickAction;

  const id = data.entityId;
  switch (data.entityType) {
    case 'task':
      return id ? `/tasks/${id}` : '/tasks';
    case 'group':
      return id ? `/chats/${id}` : '/chats';
    case 'project':
      return id ? `/projects/${id}` : '/dashboard';
    case 'client':
      return id ? `/clients/${id}` : '/dashboard';
    case 'user':
      return id ? `/more/members/${id}` : '/dashboard';
    case 'task_list':
      return '/tasks';
    default:
      return '/dashboard';
  }
};

/** A tap: navigate now if the router is mounted, else hold it until it is. */
const handleTap = (notification) => {
  const data = notification?.notification?.data || notification?.data || {};
  const route = routeFor(data);
  // Logged because a tap that goes to the wrong screen is otherwise invisible:
  // the app opens, so it looks like it worked.
  console.log(`[push] tap -> ${route} (navigator ${onNavigate ? 'ready' : 'pending'})`);
  if (onNavigate) onNavigate(route);
  else pendingRoute = route; // cold start — `setNavigator` will drain it
};

/**
 * Starts push for the signed-in user.
 *
 * Idempotent: the listeners are attached once per session. React 18 mounts
 * effects twice in development, and re-attaching would mean two navigations per
 * tap and two token registrations per launch.
 */
export const startPush = async ({ onForeground } = {}) => {
  if (!isNativeApp() || registered) return { started: false };

  const granted = await ensurePermission();
  if (!granted) {
    console.log('[push] notifications not permitted — skipping registration');
    return { started: false, reason: 'denied' };
  }

  const { api } = await plugin();
  await ensureChannel();

  listeners = [
    // Fires on first registration and again whenever FCM rotates the token —
    // the reinstall / new-device / cleared-data cases all arrive here.
    await api.addListener('registration', (t) => syncToken(t.value)),

    await api.addListener('registrationError', (err) =>
      console.warn('[push] registration error:', JSON.stringify(err))
    ),

    // Foreground. Android draws NOTHING here, which is what we want: the app is
    // open, the socket has already delivered this same event to the bell and
    // the live views, and a banner on top of that is the duplicate the backend
    // is already trying to suppress. The callback exists so a screen can react
    // (refresh a badge) if it wants to.
    await api.addListener('pushNotificationReceived', (notification) => {
      onForeground?.(notification);
    }),

    // Tap — from the background or from cold start.
    await api.addListener('pushNotificationActionPerformed', handleTap),
  ];

  // Asks FCM for a token; the 'registration' listener above receives it.
  await api.register();
  registered = true;
  return { started: true };
};

/**
 * Detaches listeners and tells the backend to forget this device.
 *
 * The server-side clear is the important half: it is what stops the *next*
 * person's notifications appearing on a phone that has been signed out of, and
 * what stops this account's notifications following a handset that has been
 * handed on. Failures are swallowed — sign-out must never be blocked by it.
 */
export const stopPush = async () => {
  if (!isNativeApp()) return;
  try {
    await notificationsApi.unregisterToken();
  } catch {
    /* signing out locally still has to succeed */
  }
  try {
    await Promise.all(listeners.map((l) => l?.remove?.()));
    const { api } = await plugin();
    // Clears anything still sitting in the tray for the account being left.
    await api.removeAllDeliveredNotifications();
  } catch {
    /* nothing left to detach */
  }
  listeners = [];
  registered = false;
  pendingRoute = null;
};

/**
 * Hands this module a navigate function, and drains a tap that arrived first.
 *
 * The cold-start ordering is the reason this exists: tapping a notification for
 * a killed app launches the app, and `pushNotificationActionPerformed` can fire
 * before React has mounted a router. Without the queue, that tap opens the app
 * on the dashboard and the notification appears to do nothing.
 */
export const setNavigator = (navigate) => {
  onNavigate = navigate;
  if (navigate && pendingRoute) {
    const route = pendingRoute;
    pendingRoute = null;
    // A tick later, so the router has finished its first render before we push
    // a new entry onto it.
    setTimeout(() => navigate(route), 0);
  }
};

/** Test seam + diagnostics. */
export const pushClientState = () => ({ registered, pendingRoute, listeners: listeners.length });
