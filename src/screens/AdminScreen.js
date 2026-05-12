import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
} from "react-native";
import { Camera } from "expo-camera";
import axios from "axios";
import BarcodeScanner from "../components/BarcodeScanner";
import { supabase, API_URL } from "../supabase";
import { C, F, S } from "../theme";

export default function AdminScreen({ navigation }) {
  const [tab, setTab] = useState("scan");
  const [scanning, setScanning] = useState(false);
  const [lastBarcode, setLastBarcode] = useState(null);
  const [barcodeInfo, setBarcodeInfo] = useState(null); // existing link if any
  const [drugQ, setDrugQ] = useState("");
  const [drugResults, setDrugResults] = useState([]);
  const [drugLoading, setDrugLoading] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const scanned = useRef(false);

  useEffect(() => {
    if (tab === "pending") loadPending();
  }, [tab]);

  async function loadPending() {
    setPendingLoading(true);
    const { data } = await supabase
      .from("drug_barcodes")
      .select("*, drugs(trade_name, scientific_name, strength)")
      .eq("verified", false)
      .order("id", { ascending: false });
    setPending(data || []);
    setPendingLoading(false);
  }

  async function handleBarcode({ data }) {
    if (scanned.current) return;
    scanned.current = true;
    setScanning(false);
    setLastBarcode(data);
    setSelectedDrug(null);
    setDrugQ("");
    setDrugResults([]);
    setBarcodeInfo(null);

    // Check if already linked
    const { data: existing } = await supabase
      .from("drug_barcodes")
      .select("*, drugs(trade_name)")
      .eq("barcode", data)
      .limit(1);

    if (existing?.length > 0) {
      setBarcodeInfo(existing[0]);
    }
  }

  function startScan() {
    scanned.current = false;
    setLastBarcode(null);
    setBarcodeInfo(null);
    setSelectedDrug(null);
    setDrugQ("");
    setDrugResults([]);
    setScanning(true);
  }

  async function searchDrug(q) {
    setDrugQ(q);
    setSelectedDrug(null);
    if (q.length < 2) {
      setDrugResults([]);
      return;
    }
    setDrugLoading(true);
    try {
      const res = await axios.get(`${API_URL}/drugs/search`, {
        params: { q, limit: 6 },
      });
      setDrugResults(res.data);
    } catch {
      setDrugResults([]);
    } finally {
      setDrugLoading(false);
    }
  }

  async function saveBarcode() {
    if (!lastBarcode || !selectedDrug) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("drug_barcodes")
        .select("id")
        .eq("barcode", lastBarcode)
        .limit(1);

      if (existing?.length > 0) {
        await supabase
          .from("drug_barcodes")
          .update({ verified: true, drug_id: selectedDrug.id })
          .eq("barcode", lastBarcode);
      } else {
        await supabase.from("drug_barcodes").insert({
          barcode: lastBarcode,
          drug_id: selectedDrug.id,
          barcode_type: "EAN13",
          verified: true,
        });
      }
      Alert.alert(
        "Saved ✓",
        `Linked to ${selectedDrug.trade_name} and verified.`,
        [{ text: "Scan another", onPress: startScan }],
      );
      setLastBarcode(null);
      setSelectedDrug(null);
      setDrugQ("");
      setDrugResults([]);
    } catch {
      Alert.alert("Error", "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function approve(id, name) {
    await supabase
      .from("drug_barcodes")
      .update({ verified: true })
      .eq("id", id);
    loadPending();
    Alert.alert("Approved ✓", `${name} is now verified.`);
  }

  async function reject(id) {
    Alert.alert("Delete submission?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await supabase.from("drug_barcodes").delete().eq("id", id);
          loadPending();
        },
      },
    ]);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigation.replace("Settings");
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />

      <View style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignOut}>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.headerTitle}>Admin Panel</Text>

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity
            style={[s.tab, tab === "scan" && s.tabActive]}
            onPress={() => setTab("scan")}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === "scan" && s.tabTextActive]}>
              Scan & Link
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, tab === "pending" && s.tabActive]}
            onPress={() => setTab("pending")}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === "pending" && s.tabTextActive]}>
              Pending{pending.length > 0 ? ` (${pending.length})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Scan & Link ── */}
        {tab === "scan" && (
          <>
            {scanning ? (
              <BarcodeScanner
                onScan={handleBarcode}
                onCancel={() => setScanning(false)}
              />
            ) : (
              <TouchableOpacity
                style={s.scanBtn}
                onPress={startScan}
                activeOpacity={0.85}
              >
                <View style={s.scanBtnIcon}>
                  <Text style={s.scanBtnIconText}>⊙</Text>
                </View>
                <Text style={s.scanBtnText}>Scan a barcode</Text>
              </TouchableOpacity>
            )}

            {/* Scanned barcode */}
            {lastBarcode && !scanning && (
              <View style={s.barcodeCard}>
                <Text style={s.barcodeLabel}>Scanned barcode</Text>
                <Text style={s.barcodeValue}>{lastBarcode}</Text>

                {barcodeInfo && (
                  <View style={s.alreadyLinked}>
                    <Text style={s.alreadyLinkedText}>
                      Already linked to:{" "}
                      <Text style={{ fontWeight: F.bold }}>
                        {barcodeInfo.drugs?.trade_name}
                      </Text>
                      {barcodeInfo.verified ? " ✓ Verified" : " · Pending"}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Drug search */}
            {lastBarcode && !scanning && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Link to drug</Text>
                <View style={s.searchBox}>
                  <Text style={s.searchIcon}>⌕</Text>
                  <TextInput
                    style={s.searchInput}
                    placeholder="Search drug name…"
                    placeholderTextColor={C.ash}
                    value={drugQ}
                    onChangeText={searchDrug}
                    autoCorrect={false}
                  />
                </View>

                {drugLoading && (
                  <ActivityIndicator
                    size="small"
                    color={C.teal}
                    style={{ marginTop: 12 }}
                  />
                )}

                {drugResults.length > 0 && !drugLoading && (
                  <View style={s.suggestList}>
                    {drugResults.map((drug, i) => {
                      const sel = selectedDrug?.id === drug.id;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[s.suggestItem, sel && s.suggestItemSelected]}
                          onPress={() => setSelectedDrug(sel ? null : drug)}
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

                {selectedDrug && (
                  <TouchableOpacity
                    style={[s.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={saveBarcode}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving ? (
                      <ActivityIndicator color={C.white} />
                    ) : (
                      <Text style={s.saveBtnText}>
                        Save & verify — {selectedDrug.trade_name}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* ── Pending ── */}
        {tab === "pending" && (
          <>
            {pendingLoading && (
              <ActivityIndicator
                size="large"
                color={C.teal}
                style={{ marginTop: 32 }}
              />
            )}

            {!pendingLoading && pending.length === 0 && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>✓</Text>
                <Text style={s.emptyTitle}>All clear</Text>
                <Text style={s.emptyDesc}>
                  No pending barcode submissions to review.
                </Text>
              </View>
            )}

            {!pendingLoading &&
              pending.map((item, i) => (
                <View key={i} style={s.pendingCard}>
                  <View style={s.pendingTop}>
                    <Text style={s.pendingDrug}>
                      {item.drugs?.trade_name || "Unknown"}
                    </Text>
                    <Text style={s.pendingSci}>
                      {item.drugs?.scientific_name} · {item.drugs?.strength}
                    </Text>
                  </View>
                  <Text style={s.pendingBarcode}>{item.barcode}</Text>
                  <View style={s.pendingActions}>
                    <TouchableOpacity
                      style={s.approveBtn}
                      onPress={() => approve(item.id, item.drugs?.trade_name)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.approveBtnText}>✓ Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={s.rejectBtn}
                      onPress={() => reject(item.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.rejectBtnText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </>
        )}
      </ScrollView>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  backBtn: {},
  backText: { color: "rgba(255,255,255,0.5)", fontSize: F.md },
  signOutText: { color: "rgba(255,255,255,0.5)", fontSize: F.sm },
  headerTitle: {
    color: C.white,
    fontSize: F.xxl,
    fontWeight: F.black,
    letterSpacing: -0.5,
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
  tab: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 10 },
  tabActive: { backgroundColor: C.white },
  tabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: F.sm,
    fontWeight: F.medium,
  },
  tabTextActive: { color: C.navy, fontWeight: F.semibold },
  scroll: { flex: 1 },
  body: { padding: 20, paddingBottom: 40 },
  scanBtn: {
    flexDirection: "row",
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 12,
  },
  scanBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnIconText: { color: C.white, fontSize: 15, fontWeight: F.bold },
  scanBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  barcodeCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.silver,
    ...S.shadowSm,
  },
  barcodeLabel: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.ash,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  barcodeValue: {
    fontSize: F.lg,
    fontWeight: F.bold,
    color: C.ink2,
    fontFamily: F.mono,
  },
  alreadyLinked: {
    marginTop: 10,
    backgroundColor: C.infoBg,
    borderRadius: 8,
    padding: 10,
  },
  alreadyLinkedText: { fontSize: F.sm, color: C.infoText },
  section: { marginTop: 20 },
  sectionTitle: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
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
  suggestList: { marginTop: 10, gap: 6 },
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
  saveBtn: {
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
  },
  saveBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  emptyWrap: { alignItems: "center", paddingVertical: 60 },
  emptyEmoji: { fontSize: 40, color: C.teal, marginBottom: 12 },
  emptyTitle: {
    fontSize: F.xl,
    fontWeight: F.bold,
    color: C.ink2,
    marginBottom: 8,
  },
  emptyDesc: { fontSize: F.md, color: C.slate, textAlign: "center" },
  pendingCard: {
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.silver,
    ...S.shadowSm,
  },
  pendingTop: { marginBottom: 8 },
  pendingDrug: { fontSize: F.md, fontWeight: F.bold, color: C.ink2 },
  pendingSci: { fontSize: F.sm, color: C.slate, marginTop: 2 },
  pendingBarcode: {
    fontSize: F.sm,
    color: C.ash,
    fontFamily: F.mono,
    marginBottom: 12,
  },
  pendingActions: { flexDirection: "row", gap: 8 },
  approveBtn: {
    flex: 1,
    backgroundColor: C.successBg,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  approveBtnText: {
    color: C.successText,
    fontWeight: F.semibold,
    fontSize: F.sm,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: C.dangerBg,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  rejectBtnText: {
    color: C.dangerText,
    fontWeight: F.semibold,
    fontSize: F.sm,
  },
});
