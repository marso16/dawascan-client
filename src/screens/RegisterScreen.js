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
  Alert,
} from "react-native";
import { supabase } from "../supabase";
import { C, F } from "../theme";

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    Alert.alert(
      "Account created!",
      "Please check your email to verify your account, then sign in.",
      [{ text: "Sign in", onPress: () => navigation.replace("Login") }],
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      <View style={s.top}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Create account</Text>
        <Text style={s.topSub}>إنشاء حساب جديد</Text>
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

        <Label text="Full name" />
        <TextInput
          style={s.input}
          placeholder="Your name"
          placeholderTextColor={C.ash}
          value={name}
          onChangeText={setName}
          autoCorrect={false}
        />

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
            placeholder="At least 6 characters"
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

        <Label text="Confirm password" />
        <TextInput
          style={s.input}
          placeholder="Repeat your password"
          placeholderTextColor={C.ash}
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry={!showPass}
        />

        <TouchableOpacity
          style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.primaryBtnText}>Create account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={s.signInLink}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={s.signInLinkText}>
            Already have an account?{" "}
            <Text style={{ color: C.teal, fontWeight: F.semibold }}>
              Sign in
            </Text>
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  backBtn: { marginBottom: 20 },
  backText: { color: "rgba(255,255,255,0.5)", fontSize: F.md },
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
  primaryBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 24,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    color: C.white,
    fontSize: F.md,
    fontWeight: F.semibold,
    letterSpacing: 0.3,
  },
  signInLink: { alignItems: "center", marginTop: 20 },
  signInLinkText: { color: C.slate, fontSize: F.sm },
});
