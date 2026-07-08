import { Image, StyleSheet, View } from "react-native";

type BrandLogoProps = {
  size?: number;
};

export function BrandLogo({ size = 120 }: BrandLogoProps) {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/branding/9jobs-logo.png")}
        style={{ width: size, height: size * 0.34 }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
