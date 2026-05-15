import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Switch,
} from "react-native";
import { supabase } from "../supabase";
import { C, F, S } from "../theme";
import { ADMIN_EMAILS } from "../supabase";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // When keepLoggedIn is false, session expires when app is closed
        persistSession: keepLoggedIn,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const isAdmin = ADMIN_EMAILS.includes(data.user?.email?.toLowerCase());
    navigation.replace(isAdmin ? "AdminHome" : "Home");
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      <View style={s.top}>
        <View style={s.logoRow}>
          <View style={s.logoMark}>
            <Text style={s.logoD}>D</Text>
          </View>
          <Text style={s.logoName}>DawaScan</Text>
        </View>
        <Text style={s.topTitle}>Welcome back</Text>
        <Text style={s.topSub}>مرحباً بعودتك</Text>
      </View>

      <ScrollView
        style={s.card}
        contentContainerStyle={s.cardBody}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorIcon}>!</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Label text="Email address" />
        <TextInput
          style={s.input}
          placeholder="you@example.com"
          placeholderTextColor={C.ash}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Label text="Password" />
        <View style={s.passWrap}>
          <TextInput
            style={[s.input, s.passInput]}
            placeholder="••••••••"
            placeholderTextColor={C.ash}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity
            style={s.passToggle}
            onPress={() => setShowPass(!showPass)}
          >
            <Text style={s.passToggleText}>{showPass ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        {/* Keep logged in toggle */}
        <View style={s.keepRow}>
          <View style={s.keepLeft}>
            <Text style={s.keepTitle}>Keep me logged in</Text>
            <Text style={s.keepSub}>Stay signed in when you close the app</Text>
          </View>
          <Switch
            value={keepLoggedIn}
            onValueChange={setKeepLoggedIn}
            trackColor={{ false: C.silver, true: C.teal }}
            thumbColor={C.white}
          />
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.primaryBtnText}>Sign in</Text>
          )}
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => navigation.navigate("Register")}
          activeOpacity={0.8}
        >
          <Text style={s.secondaryBtnText}>Create a new account</Text>
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          By signing in you agree to our terms of use. Drug data is sourced from
          Lebanon's Ministry of Public Health and is not a substitute for
          professional medical advice.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  top: {
    backgroundColor: C.ink,
    paddingTop: Platform.OS === "android" ? 48 : 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 28,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  logoD: { color: C.white, fontSize: 18, fontWeight: F.black },
  logoName: { color: C.white, fontSize: 18, fontWeight: F.bold },
  topTitle: {
    color: C.white,
    fontSize: F.xxxl,
    fontWeight: F.black,
    letterSpacing: -0.5,
  },
  topSub: { color: "rgba(255,255,255,0.4)", fontSize: F.lg, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: C.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  cardBody: { padding: 28, paddingBottom: 48 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.dangerBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.danger,
    color: C.white,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: F.bold,
    fontSize: F.sm,
  },
  errorText: { color: C.dangerText, fontSize: F.sm, flex: 1, lineHeight: 20 },
  label: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: C.snow,
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: F.md,
    color: C.ink2,
  },
  passWrap: { position: "relative" },
  passInput: { paddingRight: 70 },
  passToggle: {
    position: "absolute",
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  passToggleText: { color: C.teal, fontSize: F.sm, fontWeight: F.semibold },
  keepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.snow,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.silver,
  },
  keepLeft: { flex: 1, marginRight: 12 },
  keepTitle: { fontSize: F.sm, fontWeight: F.semibold, color: C.ink2 },
  keepSub: { fontSize: F.xs, color: C.slate, marginTop: 2 },
  primaryBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: C.white,
    fontSize: F.md,
    fontWeight: F.semibold,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.silver },
  dividerText: { color: C.ash, fontSize: F.sm },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryBtnText: { color: C.charcoal, fontSize: F.md, fontWeight: F.medium },
  disclaimer: {
    fontSize: F.xs,
    color: C.ash,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 24,
  },
});
