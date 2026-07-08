const appConfig = require("../../app.json");
const packageJson = require("../../package.json");

describe("native app config", () => {
  test("defines a dedicated Android package for the 9Jobs app", () => {
    expect(appConfig.expo.android.package).toBe("com.ninejobs.mobile");
  });

  test("exposes a native Android build script", () => {
    expect(packageJson.scripts["android:native"]).toBe("expo run:android");
  });
});
