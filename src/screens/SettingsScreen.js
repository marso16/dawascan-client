import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
} from "react-native";
import { supabase } from "../supabase";
import { C, F, S } from "../theme";

export default function SettingsScreen({ navigation }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
  }, []);

  async function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          navigation.replace("Login");
        },
      },
    ]);
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <Text style={s.headerTitleAr}>الإعدادات</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.body}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        {user && (
          <View style={s.userCard}>
            <View style={s.userAvatar}>
              <Text style={s.userAvatarText}>
                {(user.user_metadata?.full_name ||
                  user.email ||
                  "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName}>
                {user.user_metadata?.full_name || "User"}
              </Text>
              <Text style={s.userEmail}>{user.email}</Text>
            </View>
          </View>
        )}

        <SettingsRow
          icon="👤"
          title="My account"
          subtitle="Update your name and password"
          onPress={() => navigation.navigate("Profile")}
          arrow
        />

        <SettingsRow
          icon="🕐"
          title="Scan history"
          subtitle="View your past drug scans"
          onPress={() => navigation.navigate("ScanHistory")}
          arrow
        />

        <SettingsRow
          icon="💊"
          title="Drug shortages"
          subtitle="Browse and report drug availability"
          onPress={() => navigation.navigate("Shortages")}
          arrow
        />

        <SettingsRow
          icon="🗺"
          title="Pharmacy map"
          subtitle="Find pharmacies and drug availability near you"
          onPress={() => navigation.navigate("PharmacyMap")}
          arrow
        />

        <SectionTitle text="About · حول التطبيق" />
        <SettingsRow
          icon="🏥"
          title="Data source"
          subtitle="Lebanon Ministry of Public Health"
        />
        <SettingsRow icon="📋" title="Version" subtitle="1.0.0" />
        <SettingsRow
          icon="⚠️"
          title="Disclaimer"
          subtitle="Not a substitute for medical advice · ليس بديلاً عن المشورة الطبية"
        />

        <TouchableOpacity
          style={s.signOutBtn}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={s.signOutText}>Sign out · تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ text }) {
  return <Text style={s.sectionTitle}>{text}</Text>;
}

function SettingsRow({ icon, title, subtitle, onPress, arrow }) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <Wrap style={s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={s.rowIcon}>
        <Text style={s.rowIconText}>{icon}</Text>
      </View>
      <View style={s.rowContent}>
        <Text style={s.rowTitle}>{title}</Text>
        {subtitle ? <Text style={s.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {arrow && <Text style={s.rowArrow}>›</Text>}
    </Wrap>
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
  body: { padding: 20, paddingBottom: 48 },
  userCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.silver,
    ...S.shadowSm,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: { color: C.white, fontSize: F.xl, fontWeight: F.bold },
  userName: { fontSize: F.md, fontWeight: F.semibold, color: C.ink2 },
  userEmail: { fontSize: F.sm, color: C.slate, marginTop: 2 },
  sectionTitle: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.ash,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
  },
  row: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.silver,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.snow,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconText: { fontSize: 18 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: F.md, fontWeight: F.medium, color: C.ink2 },
  rowSubtitle: { fontSize: F.xs, color: C.slate, marginTop: 2, lineHeight: 16 },
  rowArrow: { fontSize: 22, color: C.ash },
  signOutBtn: {
    marginTop: 32,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: C.dangerBg,
  },
  signOutText: { color: C.dangerText, fontSize: F.md, fontWeight: F.semibold },
});
