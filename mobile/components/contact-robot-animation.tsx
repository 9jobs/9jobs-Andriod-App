import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "@/theme";
import { useReducedMotionPreference } from "@/components/motion/ReducedMotion";

export default function ContactRobotAnimation() {
  const reducedMotion = useReducedMotionPreference();
  const float = useRef(new Animated.Value(0)).current;
  const wave = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;
  const pillMotion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) {
      float.setValue(0);
      wave.setValue(0);
      blink.setValue(1);
      pillMotion.setValue(0);
      return;
    }

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    const waveLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, { toValue: 1, duration: 520, useNativeDriver: false }),
        Animated.timing(wave, { toValue: 0, duration: 520, useNativeDriver: false }),
        Animated.delay(900),
      ]),
    );
    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(2200),
        Animated.timing(blink, { toValue: 0.12, duration: 90, useNativeDriver: false }),
        Animated.timing(blink, { toValue: 1, duration: 120, useNativeDriver: false }),
      ]),
    );
    const pillLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pillMotion, {
          toValue: 1,
          duration: 1150,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(pillMotion, {
          toValue: 0,
          duration: 1150,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );

    floatLoop.start();
    waveLoop.start();
    blinkLoop.start();
    pillLoop.start();
    return () => {
      floatLoop.stop();
      waveLoop.stop();
      blinkLoop.stop();
      pillLoop.stop();
    };
  }, [blink, float, pillMotion, reducedMotion, wave]);

  return (
    <View style={styles.stage} accessibilityLabel="Animated 9Jobs contact robot">
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
      <Animated.View
        style={[
          styles.contactPill,
          {
            transform: [
              {
                translateX: pillMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-3, 7],
                }),
              },
              {
                translateY: pillMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [3, -3],
                }),
              },
              {
                scale: pillMotion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1.04],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.statusDot} />
        <Text style={styles.contactText}>CONTACT ME</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.robot,
          {
            transform: [
              {
                translateY: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: [9, -10],
                }),
              },
              {
                rotate: float.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["-2deg", "2deg"],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.antenna}>
          <View style={styles.antennaStem} />
          <View style={styles.antennaDot} />
        </View>
        <View style={styles.head}>
          <View style={styles.face}>
            <Animated.View style={[styles.eye, { opacity: blink }]} />
            <Animated.View style={[styles.eye, { opacity: blink }]} />
          </View>
          <View style={styles.ear} />
        </View>
        <View style={styles.body}>
          <View style={styles.chestMark}>
            <Text style={styles.chestText}>9J</Text>
          </View>
        </View>
        <Animated.View
          style={[
            styles.arm,
            {
              transform: [
                { translateX: -7 },
                {
                  rotate: wave.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["-28deg", "32deg"],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.hand} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: "100%",
    height: 190,
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.dark,
  },
  glowOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: -22,
    top: -56,
    backgroundColor: "rgba(163,230,53,0.12)",
  },
  glowTwo: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    left: -28,
    bottom: -34,
    backgroundColor: "rgba(163,230,53,0.08)",
  },
  contactPill: {
    position: "absolute",
    left: 20,
    top: 67,
    height: 54,
    paddingHorizontal: 17,
    borderRadius: 18,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.dark,
  },
  contactText: {
    color: colors.dark,
    fontSize: 17,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 0.7,
  },
  robot: {
    position: "absolute",
    right: 24,
    top: 20,
    width: 125,
    height: 170,
    alignItems: "center",
  },
  antenna: {
    height: 27,
    alignItems: "center",
  },
  antennaStem: {
    width: 4,
    height: 20,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  antennaDot: {
    position: "absolute",
    top: -2,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  head: {
    width: 100,
    height: 72,
    borderRadius: 34,
    backgroundColor: "#FFFEFA",
    borderWidth: 3,
    borderColor: "#DDE7C7",
    alignItems: "center",
    justifyContent: "center",
  },
  face: {
    width: 72,
    height: 39,
    borderRadius: 17,
    backgroundColor: colors.dark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
  },
  eye: {
    width: 9,
    height: 17,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  ear: {
    position: "absolute",
    right: -7,
    width: 14,
    height: 30,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: "#FFFEFA",
  },
  body: {
    width: 76,
    height: 69,
    marginTop: -2,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#FFFEFA",
    borderWidth: 3,
    borderColor: "#DDE7C7",
    alignItems: "center",
    paddingTop: 14,
  },
  chestMark: {
    width: 31,
    height: 25,
    borderRadius: 9,
    backgroundColor: colors.dark,
    alignItems: "center",
    justifyContent: "center",
  },
  chestText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
  },
  arm: {
    position: "absolute",
    left: -3,
    top: 103,
    width: 48,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFEFA",
    borderWidth: 3,
    borderColor: "#DDE7C7",
    transformOrigin: "right center",
  },
  hand: {
    position: "absolute",
    left: -9,
    top: -3,
    width: 17,
    height: 20,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
});
