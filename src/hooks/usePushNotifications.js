import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { startPush, stopPush, setNavigator } from '../push/pushClient.js';
import { selectUser } from '../store/slices/authSlice.js';
import { fetchNotifications } from '../store/slices/notificationSlice.js';
import { isNativeApp } from '../utils/native.js';

/**
 * Wires push notifications into the authenticated app shell.
 *
 * MOUNTED INSIDE THE PROTECTED LAYOUT, NOT AT THE APP ROOT. Registration has to
 * happen against a known account — the backend stores the token on
 * `req.user.sub` — so it must run *after* sign-in, not on launch. Putting it in
 * `AppLayout` means it starts on login and on every subsequent launch that
 * restores a session, and stops when the user is no longer there.
 *
 * Web is a no-op: `startPush` returns immediately off-native, so this hook
 * costs a browser session nothing.
 */
export const usePushNotifications = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);

  // Give the push client a way to navigate, and let it replay a tap that
  // arrived during a cold start before the router existed.
  useEffect(() => {
    setNavigator(navigate);
    return () => setNavigator(null);
  }, [navigate]);

  useEffect(() => {
    if (!isNativeApp() || !user?.id) return undefined;

    let cancelled = false;

    startPush({
      // Foreground: deliberately no banner — the socket has already updated the
      // bell and the open screen, and a second copy is the duplicate the
      // backend suppresses server-side. Refreshing the list keeps the badge
      // correct for the (rare) case where the socket is down but FCM is not.
      onForeground: () => {
        if (!cancelled) dispatch(fetchNotifications());
      },
    }).catch((err) => console.warn('[push] start failed:', err?.message));

    return () => {
      cancelled = true;
    };
    // Keyed on the user id: signing in as somebody else re-registers the device
    // against the new account, which is what makes the token follow the person
    // rather than the installation.
  }, [user?.id, dispatch]);
};

/**
 * The sign-out half.
 *
 * Exported separately rather than folded into the hook's cleanup: the cleanup
 * also runs on unmount (navigating to a non-layout route, a hot reload), and
 * unregistering the device then would silently switch push off for a user who
 * never signed out.
 */
export const teardownPush = () => stopPush();
