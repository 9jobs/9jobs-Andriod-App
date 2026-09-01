const fs = require("fs");
const path = require("path");

const targetFile = path.resolve(
  __dirname,
  "../node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/ScreensModule.kt",
);

if (!fs.existsSync(targetFile)) {
  console.warn("[patch-react-native-screens-fabric] Target file not found, skipping.");
  process.exit(0);
}

const source = fs.readFileSync(targetFile, "utf8");
const needle = `    val fabricUIManager =
        UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC) as FabricUIManager
    proxy?.apply {
      nativeAddMutationsListener(fabricUIManager)
    }`;

const replacement = `    val fabricUIManager =
        UIManagerHelper.getUIManager(reactContext, UIManagerType.FABRIC) as? FabricUIManager
    if (fabricUIManager == null) {
      Log.w("[RNScreens]", "FabricUIManager is not ready yet. Skipping setupFabric call.")
      return
    }
    proxy?.apply {
      nativeAddMutationsListener(fabricUIManager)
    }`;

if (source.includes("Skipping setupFabric call.")) {
  console.log("[patch-react-native-screens-fabric] Patch already applied.");
  process.exit(0);
}

if (!source.includes(needle)) {
  console.warn("[patch-react-native-screens-fabric] Expected source block not found, skipping.");
  process.exit(0);
}

fs.writeFileSync(targetFile, source.replace(needle, replacement), "utf8");
console.log("[patch-react-native-screens-fabric] Applied FabricUIManager null-guard.");
