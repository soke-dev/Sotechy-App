// Push notifications: after sign-in the phone asks for permission and registers its Expo push token with
// the account; tapping a notification opens the screen in its `url`. Needs a development or store build
// (Expo Go on Android can't receive push).
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { router, type Href } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { api } from "./api";
import { useAuth } from "./auth";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** The token this phone registered, so signing out can unregister it */
let registered: string | null = null;

async function pushToken(): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  if (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Orders and updates",
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: "#F7931E",
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

/** Called by sign-out while the session still works; never blocks signing out */
export async function forgetPushDevice() {
  if (!registered) return;
  const token = registered;
  registered = null;
  await api.unregisterPushDevice(token).catch(() => {});
}

/** Registers the phone for the signed-in account and handles taps on notifications */
function PhonePushNotifications() {
  const { user } = useAuth();
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!user) return;
    pushToken()
      .then(async (token) => {
        if (!token || Platform.OS === "web") return;
        await api.registerPushDevice({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
        registered = token;
      })
      .catch((err) => console.warn("Push registration failed:", err instanceof Error ? err.message : err));
  }, [user]);

  useEffect(() => {
    const url = lastResponse?.notification.request.content.data?.url;
    if (typeof url === "string" && url.startsWith("/")) router.push(url as Href);
  }, [lastResponse]);

  return null;
}

// Browsers have no push here (and the notification hooks throw on web)
export const PushNotifications = Platform.OS === "web" ? () => null : PhonePushNotifications;
