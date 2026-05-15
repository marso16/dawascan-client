import { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  StatusBar,
} from "react-native";
import { C, F } from "../theme";
import { Image } from "react-native";

export default function OnboardingScreen({ navigation }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse dot
    Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(dotAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Auto-navigate after 2.5s
    const timer = setTimeout(() => navigation.replace("Login"), 2500);
    return () => clearTimeout(timer);
  }, []);

  const dotScale = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });
  const dotOpacity = dotAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      {/* Background pattern */}
      <View style={s.bgPattern}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              s.bgCircle,
              {
                width: 80 + i * 60,
                height: 80 + i * 60,
                borderRadius: (80 + i * 60) / 2,
                opacity: 0.03 + i * 0.01,
                top: "50%",
                left: "50%",
                marginTop: -(40 + i * 30),
                marginLeft: -(40 + i * 30),
              },
            ]}
          />
        ))}
      </View>

      {/* Grid lines */}
      <View style={s.gridLines}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={[s.gridLine, { left: `${i * 14.28}%` }]} />
        ))}
      </View>

      <Animated.View
        style={[
          s.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo mark */}
        <View style={s.logoWrap}>
          <View style={s.logoOuter}>
            <Image
              source={require("../../assets/icon.png")}
              style={{ width: 66, height: 66, borderRadius: 16 }}
              resizeMode="contain"
            />
          </View>
          {/* Pulse ring */}
          <Animated.View
            style={[
              s.pulseRing,
              { transform: [{ scale: dotScale }], opacity: dotOpacity },
            ]}
          />
        </View>

        {/* Name */}
        <Text style={s.appName}>DawaScan</Text>
        <Text style={s.appNameAr}>داوا سكان</Text>

        {/* Tagline */}
        <View style={s.taglineWrap}>
          <View style={s.taglineDot} />
          <Text style={s.tagline}>Lebanon Drug Verification</Text>
          <View style={s.taglineDot} />
        </View>
      </Animated.View>

      {/* Bottom bar */}
      <View style={s.bottomBar}>
        <Text style={s.bottomText}>Powered by Lebanon MoPH data</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  bgPattern: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  bgCircle: { position: "absolute", borderWidth: 1, borderColor: C.white },
  gridLines: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  content: { alignItems: "center", gap: 8 },
  logoWrap: { position: "relative", marginBottom: 24 },
  logoOuter: {
    width: 90,
    height: 90,
    borderRadius: 26,
    backgroundColor: "rgba(0,184,156,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,184,156,0.3)",
  },
  logoInner: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  logoD: {
    color: C.white,
    fontSize: 36,
    fontWeight: F.black,
    letterSpacing: -1,
  },
  pulseRing: {
    position: "absolute",
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 32,
    borderWidth: 1.5,
    borderColor: C.teal,
  },
  appName: {
    color: C.white,
    fontSize: 36,
    fontWeight: F.black,
    letterSpacing: -1,
  },
  appNameAr: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 18,
    fontWeight: F.medium,
    letterSpacing: 2,
  },
  taglineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  taglineDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.teal },
  tagline: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  bottomBar: { position: "absolute", bottom: Platform.OS === "ios" ? 40 : 24 },
  bottomText: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
