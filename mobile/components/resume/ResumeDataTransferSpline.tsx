import { StyleSheet, View } from "react-native";

let WebView: any = null;
try {
  WebView = require("react-native-webview").WebView;
} catch (error) {
  // Gracefully catch if react-native-webview native module is not registered in the native binary
}

const SCENE_URL = "https://my.spline.design/datatransfer-K41ecQGTxUpbI2c26wcF6NFX/";
export function ResumeDataTransferSpline() {
  if (!WebView) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <WebView
        source={{ uri: SCENE_URL }}
        style={styles.webView}
        originWhitelist={["https://*"]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        androidLayerType="hardware"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: "#030713",
  },
  webView: {
    flex: 1,
    backgroundColor: "#030713",
  },
});
