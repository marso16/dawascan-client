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
} from "react-native";
import { supabase } from "../supabase";
import { C, F, S } from "../theme";

const ADMIN_EMAILS = ["marckey2345@gmail.com"];

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }

    // Check if this user is an admin
    const isAdmin = ADMIN_EMAILS.includes(data.user?.email?.toLowerCase());
    if (!isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("This account does not have admin access.");
      return;
    }

    setLoading(false);
    navigation.replace("Admin");
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
        <View style={s.lockIcon}>
          <Text style={s.lockEmoji}>🔐</Text>
        </View>
        <Text style={s.topTitle}>Admin access</Text>
        <Text style={s.topSub}>Only authorized accounts can sign in here.</Text>
      </View>

      <ScrollView
        style={s.card}
        contentContainerStyle={s.cardBody}
        keyboardShouldPersistTaps="handled"
      >
        {error ? (
          <View style={s.errorBox}>
            <Text style={s.errorIcon}>!</Text>
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={s.label}>Admin email</Text>
        <TextInput
          style={s.input}
          placeholder="admin@example.com"
          placeholderTextColor={C.ash}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Text style={s.label}>Password</Text>
        <TextInput
          style={s.input}
          placeholder="••••••••"
          placeholderTextColor={C.ash}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[s.primaryBtn, loading && s.primaryBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={C.white} />
          ) : (
            <Text style={s.primaryBtnText}>Sign in as admin</Text>
          )}
        </TouchableOpacity>

        <Text style={s.note}>
          Admin access is restricted. If you believe you should have access,
          contact the DawaScan team.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  top: {
    backgroundColor: C.ink,
    paddingTop: Platform.OS === "android" ? 48 : 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  backBtn: { alignSelf: "flex-start", marginBottom: 24 },
  backText: { color: "rgba(255,255,255,0.5)", fontSize: F.md },
  lockIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  lockEmoji: { fontSize: 32 },
  topTitle: {
    color: C.white,
    fontSize: F.xxl,
    fontWeight: F.black,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  topSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: F.sm,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
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
  errorText: { color: C.dangerText, fontSize: F.sm, flex: 1 },
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
  primaryBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    marginTop: 24,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  note: {
    fontSize: F.xs,
    color: C.ash,
    textAlign: "center",
    marginTop: 24,
    lineHeight: 18,
  },
});
