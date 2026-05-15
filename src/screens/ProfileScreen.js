import { useState, useEffect } from "react";
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
import { C, F, S } from "../theme";

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [infoMsg, setInfoMsg] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const [infoError, setInfoError] = useState("");
  const [passError, setPassError] = useState("");
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [deletionLoading, setDeletionLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user);
        setName(data.user.user_metadata?.full_name || "");
        setEmail(data.user.email || "");
        checkDeletionRequest(data.user.id);
      }
    });
  }, []);

  async function checkDeletionRequest(userId) {
    const { data } = await supabase
      .from("account_deletion_requests")
      .select("*")
      .eq("user_id", userId)
      .eq("cancelled", false)
      .order("requested_at", { ascending: false })
      .limit(1);
    if (data?.length > 0) setDeletionRequest(data[0]);
  }

  async function handleUpdateInfo() {
    if (!name.trim()) {
      setInfoError("Name cannot be empty.");
      return;
    }
    setSavingInfo(true);
    setInfoError("");
    setInfoMsg("");
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    });
    setSavingInfo(false);
    if (error) {
      setInfoError(error.message);
      return;
    }
    setInfoMsg("Name updated successfully.");
  }

  async function handleUpdatePassword() {
    if (!newPassword) {
      setPassError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 6) {
      setPassError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError("Passwords do not match.");
      return;
    }
    setSavingPass(true);
    setPassError("");
    setPassMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPass(false);
    if (error) {
      setPassError(error.message);
      return;
    }
    setPassMsg("Password updated successfully.");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleRequestDeletion() {
    Alert.alert(
      "Delete account",
      "Your account will be permanently deleted after 7 days. You can cancel this request anytime before then.\n\nحذف الحساب نهائياً بعد 7 أيام.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request deletion",
          style: "destructive",
          onPress: async () => {
            setDeletionLoading(true);
            const deleteAfter = new Date();
            deleteAfter.setDate(deleteAfter.getDate() + 7);
            const { data, error } = await supabase
              .from("account_deletion_requests")
              .insert({
                user_id: user.id,
                delete_after: deleteAfter.toISOString(),
              })
              .select()
              .single();
            setDeletionLoading(false);
            if (error) {
              Alert.alert("Error", "Could not submit deletion request.");
              return;
            }
            setDeletionRequest(data);
            Alert.alert(
              "Request submitted",
              `Your account will be deleted on ${deleteAfter.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. You can cancel this anytime from your profile.`,
            );
          },
        },
      ],
    );
  }

  async function handleCancelDeletion() {
    Alert.alert(
      "Cancel deletion",
      "Your account will NOT be deleted. Do you want to cancel the deletion request?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, cancel deletion",
          onPress: async () => {
            setDeletionLoading(true);
            await supabase
              .from("account_deletion_requests")
              .update({ cancelled: true })
              .eq("id", deletionRequest.id);
            setDeletionRequest(null);
            setDeletionLoading(false);
            Alert.alert(
              "Cancelled",
              "Your account deletion request has been cancelled.",
            );
          },
        },
      ],
    );
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigation.replace("Login");
  }

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const deletionDate = deletionRequest
    ? new Date(deletionRequest.delete_after).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My account</Text>
        <Text style={s.headerTitleAr}>حسابي</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.avatarName}>{name || "Your name"}</Text>
          <Text style={s.avatarEmail}>{email}</Text>
        </View>

        {/* Deletion warning banner */}
        {deletionRequest && (
          <View style={s.deletionBanner}>
            <Text style={s.deletionBannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.deletionBannerTitle}>
                Account scheduled for deletion
              </Text>
              <Text style={s.deletionBannerDesc}>
                Your account will be permanently deleted on {deletionDate}.
              </Text>
            </View>
          </View>
        )}

        {/* Personal info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Personal information · معلومات شخصية
          </Text>
          {infoError ? <MsgBox text={infoError} type="error" /> : null}
          {infoMsg ? <MsgBox text={infoMsg} type="success" /> : null}
          <Label text="Full name" />
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={C.ash}
            autoCorrect={false}
          />
          <Label text="Email address" />
          <View style={s.inputDisabled}>
            <Text style={s.inputDisabledText}>{email}</Text>
          </View>
          <Text style={s.inputHint}>Email cannot be changed.</Text>
          <TouchableOpacity
            style={[s.primaryBtn, savingInfo && s.primaryBtnDisabled]}
            onPress={handleUpdateInfo}
            disabled={savingInfo}
            activeOpacity={0.85}
          >
            {savingInfo ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={s.primaryBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Change password */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>
            Change password · تغيير كلمة المرور
          </Text>
          {passError ? <MsgBox text={passError} type="error" /> : null}
          {passMsg ? <MsgBox text={passMsg} type="success" /> : null}
          <Label text="New password" />
          <View style={s.passWrap}>
            <TextInput
              style={[s.input, s.passInput]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={C.ash}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity
              style={s.passToggle}
              onPress={() => setShowPass(!showPass)}
            >
              <Text style={s.passToggleText}>{showPass ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
          </View>
          <Label text="Confirm new password" />
          <TextInput
            style={s.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat new password"
            placeholderTextColor={C.ash}
            secureTextEntry={!showPass}
          />
          <TouchableOpacity
            style={[s.primaryBtn, savingPass && s.primaryBtnDisabled]}
            onPress={handleUpdatePassword}
            disabled={savingPass}
            activeOpacity={0.85}
          >
            {savingPass ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={s.primaryBtnText}>Update password</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Account actions */}
        <View style={s.dangerZone}>
          <Text style={s.dangerTitle}>Account actions</Text>

          <TouchableOpacity
            style={s.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <Text style={s.signOutText}>Sign out · تسجيل الخروج</Text>
          </TouchableOpacity>

          {deletionRequest ? (
            <TouchableOpacity
              style={[s.cancelDeletionBtn, deletionLoading && { opacity: 0.6 }]}
              onPress={handleCancelDeletion}
              disabled={deletionLoading}
              activeOpacity={0.8}
            >
              {deletionLoading ? (
                <ActivityIndicator color={C.teal} />
              ) : (
                <Text style={s.cancelDeletionText}>
                  Cancel account deletion · إلغاء طلب الحذف
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.deleteBtn, deletionLoading && { opacity: 0.6 }]}
              onPress={handleRequestDeletion}
              disabled={deletionLoading}
              activeOpacity={0.8}
            >
              {deletionLoading ? (
                <ActivityIndicator color={C.dangerText} />
              ) : (
                <Text style={s.deleteBtnText}>Delete account · حذف الحساب</Text>
              )}
            </TouchableOpacity>
          )}

          <Text style={s.deleteHint}>
            Deleted accounts are permanently removed after 7 days. You can
            cancel anytime before then.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ text }) {
  return <Text style={s.label}>{text}</Text>;
}

function MsgBox({ text, type }) {
  const isError = type === "error";
  return (
    <View style={[s.msgBox, isError ? s.msgBoxError : s.msgBoxSuccess]}>
      <Text style={[s.msgText, isError ? s.msgTextError : s.msgTextSuccess]}>
        {text}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.snow },
  header: {
    backgroundColor: C.navy,
    paddingTop: Platform.OS === "android" ? 44 : 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 16 },
  backText: { color: "rgba(255,255,255,0.5)", fontSize: F.md },
  headerTitle: {
    color: C.white,
    fontSize: F.xxl,
    fontWeight: F.black,
    letterSpacing: -0.5,
  },
  headerTitleAr: {
    color: "rgba(255,255,255,0.4)",
    fontSize: F.md,
    marginTop: 4,
  },
  scroll: { flex: 1 },
  body: { padding: 20, paddingBottom: 60 },
  avatarWrap: { alignItems: "center", paddingVertical: 24 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...S.shadow,
  },
  avatarText: { color: C.white, fontSize: F.xxl, fontWeight: F.black },
  avatarName: { fontSize: F.lg, fontWeight: F.bold, color: C.ink2 },
  avatarEmail: { fontSize: F.sm, color: C.slate, marginTop: 4 },
  deletionBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: C.warnBg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FCD34D",
  },
  deletionBannerIcon: { fontSize: 20 },
  deletionBannerTitle: {
    fontSize: F.sm,
    fontWeight: F.bold,
    color: C.warnText,
  },
  deletionBannerDesc: {
    fontSize: F.xs,
    color: C.warnText,
    marginTop: 3,
    lineHeight: 18,
  },
  section: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.silver,
    ...S.shadowSm,
  },
  sectionTitle: {
    fontSize: F.sm,
    fontWeight: F.semibold,
    color: C.slate,
    marginBottom: 16,
  },
  label: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
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
  inputDisabled: {
    backgroundColor: C.mist,
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputDisabledText: { fontSize: F.md, color: C.ash },
  inputHint: { fontSize: F.xs, color: C.ash, marginTop: 6 },
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
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  msgBox: { borderRadius: 10, padding: 12, marginBottom: 4 },
  msgBoxError: {
    backgroundColor: C.dangerBg,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  msgBoxSuccess: {
    backgroundColor: C.successBg,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  msgText: { fontSize: F.sm, lineHeight: 20 },
  msgTextError: { color: C.dangerText },
  msgTextSuccess: { color: C.successText },
  dangerZone: { marginTop: 8, gap: 10 },
  dangerTitle: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.ash,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: C.dangerBg,
  },
  signOutText: { color: C.dangerText, fontSize: F.md, fontWeight: F.semibold },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: C.white,
  },
  deleteBtnText: { color: C.dangerText, fontSize: F.md, fontWeight: F.medium },
  cancelDeletionBtn: {
    borderWidth: 1.5,
    borderColor: C.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: C.tealBg,
  },
  cancelDeletionText: {
    color: C.tealText,
    fontSize: F.md,
    fontWeight: F.semibold,
  },
  deleteHint: {
    fontSize: F.xs,
    color: C.ash,
    textAlign: "center",
    lineHeight: 18,
  },
});
