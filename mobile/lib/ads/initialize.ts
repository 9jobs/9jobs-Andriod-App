import mobileAds from "react-native-google-mobile-ads";

let started = false;

export function initializeAdMob() {
  if (started) return;
  started = true;
  void mobileAds().initialize().catch((error: unknown) => {
    if (__DEV__) console.warn("[AdMob] Test SDK initialization failed:", error);
  });
}
