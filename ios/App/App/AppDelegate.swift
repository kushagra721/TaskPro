import UIKit
import Capacitor
import FirebaseCore
import FirebaseMessaging

/**
 * ============================================================================
 *  iOS PUSH — why this file has to exist at all
 * ============================================================================
 *
 * On Android, `@capacitor/push-notifications` hands JavaScript an **FCM**
 * registration token and the backend sends to it directly. On iOS the same
 * plugin hands back an **APNs device token**, which is a different thing
 * entirely — Firebase Admin cannot send to it, and the send fails with
 * "Requested entity was not found" long after the app has cheerfully reported
 * that push is set up.
 *
 * So iOS needs a translation step, and this is it:
 *
 *   1. APNs gives us the device token (`didRegisterForRemoteNotifications…`).
 *   2. We hand that to Firebase (`Messaging.messaging().apnsToken`).
 *   3. Firebase exchanges it for an FCM token.
 *   4. We post THAT string on `.capacitorDidRegisterForRemoteNotifications`.
 *
 * Step 4 works because the plugin accepts either type on that notification:
 * `Data` is hex-encoded as an APNs token, and a `String` is passed through
 * untouched (PushNotificationsPlugin.swift — `else if let stringToken =
 * notification.object as? String`). That is the documented Capacitor + Firebase
 * recipe, and it is what keeps ONE JavaScript API across both platforms: the
 * app's `pushClient.js` never learns that iOS did anything different.
 *
 * ⚠️ `FirebaseApp.configure()` MUST run before anything touches `Messaging`,
 * and it reads `GoogleService-Info.plist` from the app BUNDLE — so that file
 * has to be a member of the App target, not merely sitting in the folder.
 * Without it the app crashes on launch with "Default app has not been
 * configured".
 */
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Guarded so a missing/!invalid plist degrades to "no push" rather than
        // taking the whole app down on launch — the same rule the backend's own
        // Firebase init follows.
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
        Messaging.messaging().delegate = self
        return true
    }

    // MARK: - Remote notification registration

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Hand APNs' token to Firebase FIRST; asking for an FCM token before
        // this is set returns one that cannot actually be delivered to.
        Messaging.messaging().apnsToken = deviceToken

        Messaging.messaging().token { token, error in
            if let token = token {
                // A String here — the plugin forwards it verbatim, so JS
                // receives an FCM token exactly as it does on Android.
                NotificationCenter.default.post(
                    name: .capacitorDidRegisterForRemoteNotifications,
                    object: token
                )
            } else {
                NotificationCenter.default.post(
                    name: .capacitorDidFailToRegisterForRemoteNotifications,
                    object: error
                )
            }
        }
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

    /**
     * Firebase rotates the FCM token on its own — a restore to a new device, a
     * reinstall, or occasionally for its own reasons. Without this the backend
     * keeps a token that silently stops delivering.
     *
     * It is posted through the same notification as the first registration, so
     * `pushClient.js`'s existing `registration` listener re-syncs it with no
     * iOS-specific code on the JavaScript side.
     */
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: fcmToken
        )
    }

    // MARK: - Lifecycle (Capacitor template)

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}
