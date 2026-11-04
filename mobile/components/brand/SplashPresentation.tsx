import { useCallback, useEffect, useRef } from "react";
import { useFocusEffect } from "expo-router";
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { StatusBar } from "expo-status-bar";
import { FadeInView } from "@/components/motion/FadeInView";
import { SplashWordmark } from "./SplashWordmark";
import { SplashWaves } from "./SplashWaves";
import { useReducedMotionPreference } from "@/components/motion/ReducedMotion";

const lime = "#C4FF00";

export function SplashPresentation({ animateEntrance = false }: { animateEntrance?: boolean }) {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(width / 390, height / 742);
  const rotation = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const reducedMotion = useReducedMotionPreference();

  useFocusEffect(useCallback(() => {
    breathe.setValue(0);
    if (reducedMotion) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
      Animated.timing(breathe, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [breathe, reducedMotion]));

  useEffect(() => {
    const animation = Animated.loop(Animated.timing(rotation, {
      toValue: 1,
      duration: 1100,
      easing: Easing.linear,
      useNativeDriver: true,
      isInteraction: false,
    }));
    animation.start();
    return () => animation.stop();
  }, [rotation]);

  const content = (
    <>
      <Animated.View style={{ transform: [
        { scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] }) },
        { translateY: breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -3 * scale] }) },
      ] }}>
        <SplashWordmark fontSize={80 * scale} />
      </Animated.View>
      <Animated.View style={[styles.accent, {
        width: 54 * scale,
        marginTop: 25 * scale,
        opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
        transform: [{ scaleX: breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.28] }) }],
      }]} />
      <Text allowFontScaling={false} style={[styles.title, { fontSize: 22 * scale, lineHeight: 30 * scale, marginTop: 18 * scale }]}>
        Your career, elevated.
      </Text>
      <Text allowFontScaling={false} style={[styles.subtitle, { fontSize: 14 * scale, lineHeight: 21 * scale, marginTop: 14 * scale }]}>
        Resume. Outreach. Interview. Momentum.
      </Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Loading 9jobs" style={{ marginTop: 40 * scale }}>
        <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
          <Svg width={36 * scale} height={36 * scale} viewBox="0 0 40 40">
            <Circle cx={20} cy={20} r={16} stroke="#3B3D38" strokeWidth={3.5} fill="none" />
            <Circle cx={20} cy={20} r={16} stroke={lime} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeDasharray="68 101" rotation={-90} origin="20,20" />
          </Svg>
        </Animated.View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SplashWaves position="top" />
      <SplashWaves position="bottom" />
      {animateEntrance ? (
        <FadeInView type="fade-up" duration={360} style={[styles.content, { top: height * 0.342 }]}>{content}</FadeInView>
      ) : (
        <View style={[styles.content, { top: height * 0.342 }]}>{content}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D0F0E" },
  content: { position: "absolute", left: 12, right: 12, alignItems: "center" },
  accent: { height: 3, borderRadius: 3, backgroundColor: lime },
  title: { fontFamily: "PlusJakartaSans_700Bold", color: "#FAFAFA", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_500Medium", color: "#ACADAB", textAlign: "center", letterSpacing: -0.2 },
});
