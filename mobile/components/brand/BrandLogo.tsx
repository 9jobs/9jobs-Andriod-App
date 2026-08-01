import { Image, StyleSheet, View } from "react-native";

type BrandLogoProps = {
  size?: number;
  circle?: boolean;
};

export function BrandLogo({ size = 120, circle = false }: BrandLogoProps) {
  if (circle) {
    return (
      <View style={[styles.circleContainer, { width: size, height: size, borderRadius: size / 2 }]}>
        <Image
          source={require("../../assets/branding/9jobs-logo.png")}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }

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
  circleContainer: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
});
