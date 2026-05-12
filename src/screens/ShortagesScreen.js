import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  Alert,
  ScrollView,
} from "react-native";
import axios from "axios";
import { supabase, API_URL } from "../supabase";
import { C, F, S } from "../theme";

const REGIONS = [
  "All Lebanon",
  "Beirut",
  "Mount Lebanon",
  "North",
  "South",
  "Bekaa",
  "Nabatieh",
];

export default function ShortagesScreen({ navigation }) {
  const [tab, setTab] = useState("browse"); // 'browse' | 'report'
  const [shortages, setShortages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regionFilter, setRegionFilter] = useState("All Lebanon");

  // Report form
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState("Beirut");
  const [reportStatus, setReportStatus] = useState("shortage"); // 'shortage' | 'available'
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);

  const loadShortages = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let query = supabase
        .from("drug_shortages")
        .select("trade_name, status, region, reported_at, drug_id")
        .order("reported_at", { ascending: false })
        .limit(200);

      if (regionFilter !== "All Lebanon") {
        query = query.eq("region", regionFilter);
      }

      const { data } = await query;

      // Aggregate by drug name — count shortages, track latest report
      const map = {};
      for (const row of data || []) {
        const key = row.trade_name;
        if (!map[key]) {
          map[key] = {
            trade_name: key,
            drug_id: row.drug_id,
            shortage_count: 0,
            available_count: 0,
            last_reported: row.reported_at,
            regions: new Set(),
          };
        }
        if (row.status === "shortage") map[key].shortage_count++;
        else map[key].available_count++;
        if (row.reported_at > map[key].last_reported)
          map[key].last_reported = row.reported_at;
        if (row.region) map[key].regions.add(row.region);
      }

      const list = Object.values(map)
        .map((d) => ({ ...d, regions: [...d.regions] }))
        .sort((a, b) => b.shortage_count - a.shortage_count);

      setShortages(list);
      setLoading(false);
      setRefreshing(false);
    },
    [regionFilter],
  );

  useEffect(() => {
    loadShortages();
  }, [loadShortages]);

  async function searchDrug(q) {
    setSearchQ(q);
    setSelectedDrug(null);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API_URL}/drugs/search`, {
        params: { q, limit: 6 },
      });
      setSearchResults(res.data);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSubmit() {
    if (!selectedDrug) {
      Alert.alert("Select a drug", "Please search and select a drug first.");
      return;
    }
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("drug_shortages").insert({
        drug_id: selectedDrug.id || null,
        trade_name: selectedDrug.trade_name,
        status: reportStatus,
        region: selectedRegion,
        reported_by: user?.id || null,
      });
      setSubmitDone(true);
      loadShortages();
    } catch {
      Alert.alert("Error", "Could not submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSearchQ("");
    setSearchResults([]);
    setSelectedDrug(null);
    setSelectedRegion("Beirut");
    setReportStatus("shortage");
    setSubmitDone(false);
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const now = new Date();
    const diffH = Math.floor((now - d) / 3600000);
    const diffD = Math.floor((now - d) / 86400000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  function renderShortageItem({ item }) {
    const isShortage = item.shortage_count > item.available_count;
    return (
      <View style={s.shortageItem}>
        <View
          style={[
            s.shortageStatus,
            { backgroundColor: isShortage ? C.dangerBg : C.successBg },
          ]}
        >
          <Text
            style={[
              s.shortageStatusText,
              { color: isShortage ? C.dangerText : C.successText },
            ]}
          >
            {isShortage ? "Shortage" : "Available"}
          </Text>
        </View>
        <View style={s.shortageBody}>
          <Text style={s.shortageName}>{item.trade_name}</Text>
          <View style={s.shortageMeta}>
            <Text style={s.shortageCount}>
              {item.shortage_count} shortage
              {item.shortage_count !== 1 ? "s" : ""} reported
            </Text>
            {item.regions.length > 0 && (
              <Text style={s.shortageRegions}>
                {" "}
                · {item.regions.slice(0, 2).join(", ")}
              </Text>
            )}
          </View>
          <Text style={s.shortageTime}>{formatTime(item.last_reported)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Drug shortages</Text>
          <Text style={s.headerTitleAr}>نقص الأدوية</Text>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === "browse" && s.tabActive]}
            onPress={() => setTab("browse")}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === "browse" && s.tabTextActive]}>
              Browse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === "report" && s.tabActive]}
            onPress={() => {
              setTab("report");
              resetForm();
            }}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === "report" && s.tabTextActive]}>
              Report
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Browse tab ── */}
      {tab === "browse" && (
        <>
          {/* Region filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.regionScroll}
            contentContainerStyle={s.regionList}
          >
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[s.regionPill, regionFilter === r && s.regionPillActive]}
                onPress={() => setRegionFilter(r)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    s.regionPillText,
                    regionFilter === r && s.regionPillTextActive,
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={C.teal} />
            </View>
          ) : shortages.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyEmoji}>💊</Text>
              <Text style={s.emptyTitle}>No reports yet</Text>
              <Text style={s.emptyDesc}>
                Be the first to report a drug shortage in your area.
              </Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => {
                  setTab("report");
                  resetForm();
                }}
                activeOpacity={0.85}
              >
                <Text style={s.emptyBtnText}>Report a shortage</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={shortages}
              keyExtractor={(item, i) => `${item.trade_name}-${i}`}
              renderItem={renderShortageItem}
              contentContainerStyle={s.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => loadShortages(true)}
                  tintColor={C.teal}
                />
              }
              ItemSeparatorComponent={() => <View style={s.separator} />}
            />
          )}
        </>
      )}

      {/* ── Report tab ── */}
      {tab === "report" && (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
        >
          {submitDone ? (
            <View style={s.successWrap}>
              <View style={s.successRing}>
                <Text style={s.successIcon}>✓</Text>
              </View>
              <Text style={s.successTitle}>Report submitted!</Text>
              <Text style={s.successDesc}>
                Thank you for helping the community. Your report for{" "}
                {selectedDrug?.trade_name} has been recorded.
              </Text>
              <TouchableOpacity
                style={s.primaryBtn}
                onPress={() => {
                  setTab("browse");
                  resetForm();
                }}
                activeOpacity={0.85}
              >
                <Text style={s.primaryBtnText}>View shortages</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.secondaryBtn}
                onPress={resetForm}
                activeOpacity={0.8}
              >
                <Text style={s.secondaryBtnText}>Report another</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={s.formDesc}>
                Help your community by reporting which drugs are unavailable or
                back in stock in your area.
              </Text>

              {/* Status toggle */}
              <Text style={s.fieldLabel}>What are you reporting?</Text>
              <View style={s.toggleWrap}>
                <TouchableOpacity
                  style={[
                    s.toggleBtn,
                    reportStatus === "shortage" && s.toggleBtnDanger,
                  ]}
                  onPress={() => setReportStatus("shortage")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.toggleBtnText,
                      reportStatus === "shortage" && { color: C.dangerText },
                    ]}
                  >
                    Drug not available
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    s.toggleBtn,
                    reportStatus === "available" && s.toggleBtnSuccess,
                  ]}
                  onPress={() => setReportStatus("available")}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      s.toggleBtnText,
                      reportStatus === "available" && { color: C.successText },
                    ]}
                  >
                    Back in stock
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Drug search */}
              <Text style={s.fieldLabel}>Drug name · اسم الدواء</Text>
              <View style={s.searchBox}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  style={s.searchInput}
                  placeholder="Search drug name…"
                  placeholderTextColor={C.ash}
                  value={searchQ}
                  onChangeText={searchDrug}
                  autoCorrect={false}
                />
                {searchQ.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQ("");
                      setSearchResults([]);
                      setSelectedDrug(null);
                    }}
                  >
                    <Text style={s.clearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {searchLoading && (
                <ActivityIndicator
                  size="small"
                  color={C.teal}
                  style={{ marginTop: 10 }}
                />
              )}

              {searchResults.length > 0 && !searchLoading && (
                <View style={s.suggestList}>
                  {searchResults.map((drug, i) => {
                    const sel = selectedDrug?.trade_name === drug.trade_name;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[s.suggestItem, sel && s.suggestItemSelected]}
                        onPress={() => {
                          setSelectedDrug(sel ? null : drug);
                          setSearchResults([]);
                          setSearchQ(sel ? "" : drug.trade_name);
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              s.suggestName,
                              sel && { color: C.tealText },
                            ]}
                          >
                            {drug.trade_name}
                          </Text>
                          <Text
                            style={[s.suggestSci, sel && { color: C.teal }]}
                          >
                            {drug.scientific_name} · {drug.strength}
                          </Text>
                        </View>
                        {sel && (
                          <View style={s.checkMark}>
                            <Text style={s.checkMarkText}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Region */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>
                Your region · منطقتك
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 4 }}
              >
                <View
                  style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}
                >
                  {REGIONS.filter((r) => r !== "All Lebanon").map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        s.regionPill,
                        selectedRegion === r && s.regionPillActive,
                      ]}
                      onPress={() => setSelectedRegion(r)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          s.regionPillText,
                          selectedRegion === r && s.regionPillTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[
                  s.primaryBtn,
                  { marginTop: 24 },
                  (!selectedDrug || submitting) && s.primaryBtnDisabled,
                  reportStatus === "shortage"
                    ? s.primaryBtnDanger
                    : s.primaryBtnSuccess,
                ]}
                onPress={handleSubmit}
                disabled={!selectedDrug || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={C.white} />
                ) : (
                  <Text style={s.primaryBtnText}>
                    {reportStatus === "shortage"
                      ? `Report shortage — ${selectedDrug?.trade_name || "select a drug"}`
                      : `Mark as available — ${selectedDrug?.trade_name || "select a drug"}`}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={s.disclaimer}>
                Reports are anonymous and visible to all users. Thank you for
                helping the community.
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.snow },
  header: {
    backgroundColor: C.navy,
    paddingTop: Platform.OS === "android" ? 44 : 56,
    paddingBottom: 0,
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
    marginBottom: 16,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    padding: 3,
    alignSelf: "flex-start",
    marginBottom: 0,
  },
  tab: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 10 },
  tabActive: { backgroundColor: C.white },
  tabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: F.sm,
    fontWeight: F.medium,
  },
  tabTextActive: { color: C.navy, fontWeight: F.semibold },
  regionScroll: {
    maxHeight: 52,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderColor: C.silver,
  },
  regionList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  regionPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: S.full,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.silver,
  },
  regionPillActive: { backgroundColor: C.navy, borderColor: C.navy },
  regionPillText: { fontSize: F.xs, fontWeight: F.medium, color: C.slate },
  regionPillTextActive: { color: C.white },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
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
  separator: { height: 1, backgroundColor: C.silver, marginLeft: 16 },
  shortageItem: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  shortageStatus: {
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignSelf: "flex-start",
  },
  shortageStatusText: { fontSize: F.xs, fontWeight: F.semibold },
  shortageBody: { flex: 1 },
  shortageName: {
    fontSize: F.md,
    fontWeight: F.semibold,
    color: C.ink2,
    marginBottom: 4,
  },
  shortageMeta: { flexDirection: "row", flexWrap: "wrap" },
  shortageCount: { fontSize: F.xs, color: C.slate },
  shortageRegions: { fontSize: F.xs, color: C.ash },
  shortageTime: { fontSize: F.xs, color: C.ash, marginTop: 4 },
  scroll: { flex: 1 },
  body: { padding: 20, paddingBottom: 48 },
  formDesc: {
    fontSize: F.sm,
    color: C.slate,
    lineHeight: 21,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  toggleWrap: { flexDirection: "row", gap: 8, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.silver,
  },
  toggleBtnDanger: { backgroundColor: C.dangerBg, borderColor: "#FCA5A5" },
  toggleBtnSuccess: { backgroundColor: C.successBg, borderColor: "#6EE7B7" },
  toggleBtnText: { fontSize: F.sm, fontWeight: F.semibold, color: C.slate },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: { fontSize: 20, color: C.ash },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: F.md, color: C.ink2 },
  clearText: { color: C.ash, fontSize: F.md, padding: 4 },
  suggestList: { marginTop: 8, gap: 6 },
  suggestItem: {
    backgroundColor: C.snow,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.silver,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  suggestItemSelected: { backgroundColor: C.tealBg, borderColor: C.teal },
  suggestName: { fontSize: F.md, fontWeight: F.semibold, color: C.ink2 },
  suggestSci: { fontSize: F.xs, color: C.ash, marginTop: 2 },
  checkMark: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMarkText: { color: C.white, fontSize: F.sm, fontWeight: F.bold },
  primaryBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnDanger: { backgroundColor: C.danger },
  primaryBtnSuccess: { backgroundColor: C.success },
  primaryBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  secondaryBtnText: { color: C.charcoal, fontSize: F.md, fontWeight: F.medium },
  disclaimer: {
    fontSize: F.xs,
    color: C.ash,
    textAlign: "center",
    marginTop: 16,
    lineHeight: 18,
  },
  successWrap: { alignItems: "center", paddingTop: 40, gap: 12 },
  successRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: C.successBg,
    borderWidth: 2,
    borderColor: C.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successIcon: { fontSize: 28, color: C.success },
  successTitle: { fontSize: F.xxl, fontWeight: F.black, color: C.ink2 },
  successDesc: {
    fontSize: F.md,
    color: C.slate,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
