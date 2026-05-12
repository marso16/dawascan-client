import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  Alert,
} from "react-native";
import { supabase } from "../supabase";
import { C, F, S } from "../theme";

const VERDICT_CFG = {
  registered: {
    bg: C.successBg,
    text: C.successText,
    icon: "✓",
    label: "Registered",
  },
  not_found: { bg: C.warnBg, text: C.warnText, icon: "?", label: "Not found" },
  cancelled: {
    bg: C.dangerBg,
    text: C.dangerText,
    icon: "✕",
    label: "Cancelled",
  },
  suspended: {
    bg: C.dangerBg,
    text: C.dangerText,
    icon: "⚠",
    label: "Suspended",
  },
  unknown: { bg: C.mist, text: C.slate, icon: "·", label: "Unknown" },
};

export default function ScanHistoryScreen({ navigation }) {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadScans = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data } = await supabase
      .from("scan_history")
      .select("*")
      .eq("user_id", user.id)
      .order("scanned_at", { ascending: false })
      .limit(100);

    setScans(data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadScans();
  }, []);

  async function clearHistory() {
    Alert.alert(
      "Clear history",
      "This will delete all your scan history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            await supabase.from("scan_history").delete().eq("user_id", user.id);
            setScans([]);
          },
        },
      ],
    );
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function renderItem({ item }) {
    const v = VERDICT_CFG[item.verdict] || VERDICT_CFG.unknown;
    return (
      <View style={s.item}>
        <View style={[s.itemIcon, { backgroundColor: v.bg }]}>
          <Text style={[s.itemIconText, { color: v.text }]}>{v.icon}</Text>
        </View>
        <View style={s.itemBody}>
          <Text style={s.itemName} numberOfLines={1}>
            {item.trade_name || "Unknown drug"}
          </Text>
          {item.scientific_name ? (
            <Text style={s.itemSci} numberOfLines={1}>
              {item.scientific_name}
            </Text>
          ) : null}
          <View style={s.itemMeta}>
            <View style={[s.itemBadge, { backgroundColor: v.bg }]}>
              <Text style={[s.itemBadgeText, { color: v.text }]}>
                {v.label}
              </Text>
            </View>
            {item.barcode ? (
              <Text style={s.itemBarcode}>{item.barcode}</Text>
            ) : null}
          </View>
        </View>
        <Text style={s.itemTime}>{formatDate(item.scanned_at)}</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerRow}>
          <View>
            <Text style={s.headerTitle}>Scan history</Text>
            <Text style={s.headerTitleAr}>سجل المسح</Text>
          </View>
          {scans.length > 0 && (
            <TouchableOpacity onPress={clearHistory} style={s.clearBtn}>
              <Text style={s.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        {scans.length > 0 && (
          <Text style={s.headerCount}>
            {scans.length} scan{scans.length !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={C.teal} />
        </View>
      ) : scans.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyEmoji}>⊙</Text>
          <Text style={s.emptyTitle}>No scans yet</Text>
          <Text style={s.emptyDesc}>
            Your scan history will appear here after you verify your first drug.
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={s.emptyBtnText}>Start scanning</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadScans(true)}
              tintColor={C.teal}
            />
          }
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.snow },
  header: {
    backgroundColor: C.navy,
    paddingTop: Platform.OS === "android" ? 44 : 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: { marginBottom: 16 },
  backText: { color: "rgba(255,255,255,0.5)", fontSize: F.md },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
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
  headerCount: { color: "rgba(255,255,255,0.4)", fontSize: F.sm, marginTop: 8 },
  clearBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  clearBtnText: { color: "#FCA5A5", fontSize: F.sm, fontWeight: F.semibold },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 48, color: C.ash, marginBottom: 16 },
  emptyTitle: {
    fontSize: F.xl,
    fontWeight: F.bold,
    color: C.ink2,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: F.md,
    color: C.slate,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  list: { padding: 16, paddingBottom: 32 },
  separator: { height: 1, backgroundColor: C.silver, marginLeft: 72 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemIconText: { fontSize: F.lg, fontWeight: F.bold },
  itemBody: { flex: 1, gap: 3 },
  itemName: { fontSize: F.md, fontWeight: F.semibold, color: C.ink2 },
  itemSci: { fontSize: F.xs, color: C.slate, fontStyle: "italic" },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  itemBadge: { borderRadius: S.full, paddingVertical: 2, paddingHorizontal: 8 },
  itemBadgeText: { fontSize: F.xs, fontWeight: F.semibold },
  itemBarcode: { fontSize: F.xs, color: C.ash, fontFamily: F.mono },
  itemTime: { fontSize: F.xs, color: C.ash, flexShrink: 0 },
});
