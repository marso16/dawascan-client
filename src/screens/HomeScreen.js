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
  KeyboardAvoidingView,
  Animated,
  Share,
  Linking,
} from "react-native";
import { Camera } from "expo-camera";
import axios from "axios";
import BarcodeScanner from "../components/BarcodeScanner";
import DrugCard from "../components/DrugCard";
import { supabase, API_URL } from "../supabase";
import { C, F, S } from "../theme";

export default function HomeScreen({ navigation }) {
  const [permission, setPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [mode, setMode] = useState("scan");
  const [user, setUser] = useState(null);

  // Crowdsource
  const [lastBarcode, setLastBarcode] = useState(null);
  const [crowdQ, setCrowdQ] = useState("");
  const [crowdResults, setCrowdResults] = useState([]);
  const [crowdLoading, setCrowdLoading] = useState(false);
  const [crowdSelected, setCrowdSelected] = useState(null);
  const [crowdSubmitting, setCrowdSubmitting] = useState(false);
  const [crowdDone, setCrowdDone] = useState(false);

  const scanned = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then(({ status }) =>
      setPermission(status === "granted"),
    );
    supabase.auth.getUser().then(({ data }) => setUser(data?.user));
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  function switchMode(m) {
    setMode(m);
    Animated.spring(tabAnim, {
      toValue: m === "scan" ? 0 : 1,
      useNativeDriver: true,
    }).start();
    setResult(null);
    setSearchResults([]);
    resetCrowd();
  }

  function resetCrowd() {
    setCrowdQ("");
    setCrowdResults([]);
    setCrowdSelected(null);
    setCrowdDone(false);
  }

  async function handleBarcode({ data }) {
    if (scanned.current) return;
    scanned.current = true;
    setScanning(false);
    setLoading(true);
    setResult(null);
    resetCrowd();
    setLastBarcode(data);
    try {
      const res = await axios.get(
        `${API_URL}/drugs/barcode/${encodeURIComponent(data)}`,
      );
      setResult(res.data);
      saveScanToHistory(res.data, data);
    } catch {
      Alert.alert(
        "Connection issue",
        `Make sure your backend is running.\n${API_URL}`,
      );
    } finally {
      setLoading(false);
    }
  }

  function startScan() {
    scanned.current = false;
    setResult(null);
    resetCrowd();
    setScanning(true);
  }

  async function handleSearch() {
    if (searchQ.length < 2) return;
    setLoading(true);
    setSearchResults([]);
    setResult(null);
    try {
      const res = await axios.get(`${API_URL}/drugs/search`, {
        params: { q: searchQ },
      });
      setSearchResults(res.data);
    } catch {
      Alert.alert("Connection issue", `Could not reach ${API_URL}.`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCrowdSearch(q) {
    setCrowdQ(q);
    setCrowdSelected(null);
    if (q.length < 2) {
      setCrowdResults([]);
      return;
    }
    setCrowdLoading(true);
    try {
      const res = await axios.get(`${API_URL}/drugs/search`, {
        params: { q, limit: 5 },
      });
      setCrowdResults(res.data);
    } catch {
      setCrowdResults([]);
    } finally {
      setCrowdLoading(false);
    }
  }

  async function handleCrowdSubmit() {
    if (!crowdSelected || !lastBarcode) return;
    setCrowdSubmitting(true);
    try {
      await axios.post(`${API_URL}/drugs/link-barcode`, {
        barcode: lastBarcode,
        drug_id: crowdSelected.id,
        barcode_type: "EAN13",
      });
      setCrowdDone(true);
    } catch {
      Alert.alert("Error", "Could not save. Please try again.");
    } finally {
      setCrowdSubmitting(false);
    }
  }

  async function saveScanToHistory(scanResult, barcode) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("scan_history").insert({
        user_id: user.id,
        barcode: barcode || null,
        trade_name: scanResult.trade_name || null,
        scientific_name: scanResult.scientific_name || null,
        moph_code: scanResult.moph_code || null,
        verdict: scanResult.verdict || "unknown",
      });
    } catch {}
  }

  async function handleShare(drug = result) {
    if (!drug) return;

    const verdictMap = {
      registered: "✅ Registered with MoPH",
      not_found: "⚠️ Not in MoPH database",
      cancelled: "🚫 CANCELLED by MoPH",
      suspended: "⚠️ Registration suspended",
      unknown: "❓ Status unknown",
    };

    const msg = [
      `💊 *DawaScan Drug Verification*`,
      ``,
      `*${drug.trade_name || "Unknown drug"}*`,
      drug.scientific_name ? `_${drug.scientific_name}_` : null,
      ``,
      `Status: ${verdictMap[drug.verdict] || "❓ Unknown"}`,
      drug.moph_code ? `MoPH Code: ${drug.moph_code}` : null,
      drug.strength ? `Strength: ${drug.strength}` : null,
      drug.manufacturer ? `Manufacturer: ${drug.manufacturer}` : null,
      ``,
      `_Verified using DawaScan — Lebanon Drug Verification_`,
      `_تم التحقق باستخدام داوا سكان_`,
    ]
      .filter(Boolean)
      .join("\n");

    const waUrl = `whatsapp://send?text=${encodeURIComponent(msg)}`;
    const canOpen = await Linking.canOpenURL(waUrl);

    if (canOpen) {
      await Linking.openURL(waUrl);
    } else {
      await Share.share({ message: msg });
    }
  }

  const showCrowd = result?.verdict === "not_found" && lastBarcode;
  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.greeting}>Hello, {firstName} 👋</Text>
            <Text style={s.headerTitle}>Verify your medication</Text>
          </View>
          <TouchableOpacity
            style={s.settingsBtn}
            onPress={() => navigation.navigate("Settings")}
          >
            <View style={s.settingsBtnInner}>
              <Text style={s.settingsBtnText}>⚙</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={s.pillsWrap}>
          <View style={s.pills}>
            <TouchableOpacity
              style={[s.pill, mode === "scan" && s.pillActive]}
              onPress={() => switchMode("scan")}
              activeOpacity={0.8}
            >
              <Text style={[s.pillText, mode === "scan" && s.pillTextActive]}>
                Scan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.pill, mode === "search" && s.pillActive]}
              onPress={() => switchMode("search")}
              activeOpacity={0.8}
            >
              <Text style={[s.pillText, mode === "search" && s.pillTextActive]}>
                Search
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Scan mode */}
          {mode === "scan" && (
            <>
              {scanning ? (
                <BarcodeScanner
                  onScan={handleBarcode}
                  onCancel={() => setScanning(false)}
                />
              ) : !result ? (
                <View style={s.scanIdle}>
                  <View style={s.barcodeIllus}>
                    <View style={s.barcodeLines}>
                      {[
                        3, 5, 2, 4, 6, 2, 5, 3, 4, 6, 2, 3, 5, 4, 2, 6, 3, 5,
                      ].map((h, i) => (
                        <View
                          key={i}
                          style={[
                            s.barcodeLine,
                            { height: h * 8, width: i % 3 === 0 ? 3 : 2 },
                          ]}
                        />
                      ))}
                    </View>
                    <View style={s.barcodeCornerTL} />
                    <View style={s.barcodeCornerTR} />
                    <View style={s.barcodeCornerBL} />
                    <View style={s.barcodeCornerBR} />
                  </View>
                  <Text style={s.scanIdleTitle}>Scan a drug barcode</Text>
                  <Text style={s.scanIdleSubEn}>
                    Check if it's registered with Lebanon's MoPH
                  </Text>
                  <Text style={s.scanIdleSubAr}>
                    تحقق من تسجيله في وزارة الصحة اللبنانية
                  </Text>
                  <TouchableOpacity
                    style={[s.scanBtn, !permission && s.scanBtnDisabled]}
                    onPress={startScan}
                    disabled={!permission}
                    activeOpacity={0.85}
                  >
                    <View style={s.scanBtnIcon}>
                      <Text style={s.scanBtnIconText}>⊙</Text>
                    </View>
                    <Text style={s.scanBtnText}>
                      {permission === false
                        ? "Camera access denied"
                        : "Start scanning"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </>
          )}

          {/* Search mode */}
          {mode === "search" && (
            <View style={s.searchWrap}>
              <View style={s.searchBox}>
                <Text style={s.searchIcon}>⌕</Text>
                <TextInput
                  style={s.searchInput}
                  placeholder="Drug name in English or Arabic…"
                  placeholderTextColor={C.ash}
                  value={searchQ}
                  onChangeText={setSearchQ}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                  autoFocus
                  autoCorrect={false}
                />
                {searchQ.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQ("");
                      setSearchResults([]);
                    }}
                  >
                    <Text style={s.clearText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={s.searchSubmitBtn}
                onPress={handleSearch}
                activeOpacity={0.85}
              >
                <Text style={s.searchSubmitText}>Search</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={C.teal} />
              <Text style={s.loadingText}>Checking database…</Text>
              <Text style={s.loadingTextAr}>جارٍ التحقق من قاعدة البيانات</Text>
            </View>
          )}

          {/* Scan result */}
          {result && !loading && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <SectionLabel text="Result · النتيجة" />
              <DrugCard drug={result} />

              {/* Share button */}
              {result.found && (
                <TouchableOpacity
                  style={s.shareBtn}
                  onPress={() => handleShare(result)}
                  activeOpacity={0.8}
                >
                  <Text style={s.shareBtnIcon}>📤</Text>
                  <Text style={s.shareBtnText}>
                    Share on WhatsApp · شارك على واتساب
                  </Text>
                </TouchableOpacity>
              )}

              {/* Crowdsource */}
              {showCrowd && (
                <View style={s.crowdCard}>
                  {crowdDone ? (
                    <View style={s.crowdSuccess}>
                      <View style={s.crowdSuccessRing}>
                        <Text style={s.crowdSuccessIcon}>✓</Text>
                      </View>
                      <Text style={s.crowdSuccessTitle}>
                        Thank you! شكراً لك
                      </Text>
                      <Text style={s.crowdSuccessDesc}>
                        You've helped build the database. Our team will verify
                        it shortly.
                      </Text>
                      <TouchableOpacity
                        style={s.scanBtn}
                        onPress={startScan}
                        activeOpacity={0.85}
                      >
                        <Text style={s.scanBtnText}>Scan another</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={s.crowdHeader}>
                        <View style={s.crowdBadge}>
                          <Text style={s.crowdBadgeText}>Help us</Text>
                        </View>
                        <Text style={s.crowdTitle}>Do you know this drug?</Text>
                        <Text style={s.crowdDesc}>
                          If you can read the name on the box, search below and
                          confirm — it takes 10 seconds.
                        </Text>
                      </View>
                      <View style={s.searchBox}>
                        <Text style={s.searchIcon}>⌕</Text>
                        <TextInput
                          style={s.searchInput}
                          placeholder="Drug name on the box…"
                          placeholderTextColor={C.ash}
                          value={crowdQ}
                          onChangeText={handleCrowdSearch}
                          autoCorrect={false}
                        />
                      </View>
                      {crowdLoading && (
                        <ActivityIndicator
                          size="small"
                          color={C.teal}
                          style={{ marginTop: 12 }}
                        />
                      )}
                      {crowdResults.length > 0 && !crowdLoading && (
                        <View style={s.suggestList}>
                          {crowdResults.map((drug, i) => {
                            const sel = crowdSelected?.id === drug.id;
                            return (
                              <TouchableOpacity
                                key={i}
                                style={[
                                  s.suggestItem,
                                  sel && s.suggestItemSelected,
                                ]}
                                onPress={() =>
                                  setCrowdSelected(sel ? null : drug)
                                }
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
                                    style={[
                                      s.suggestSci,
                                      sel && { color: C.teal },
                                    ]}
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
                      {crowdSelected && (
                        <TouchableOpacity
                          style={[
                            s.confirmBtn,
                            crowdSubmitting && { opacity: 0.6 },
                          ]}
                          onPress={handleCrowdSubmit}
                          disabled={crowdSubmitting}
                          activeOpacity={0.85}
                        >
                          {crowdSubmitting ? (
                            <ActivityIndicator color={C.white} />
                          ) : (
                            <Text style={s.confirmBtnText}>
                              Confirm — {crowdSelected.trade_name}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity onPress={startScan} style={s.skipLink}>
                        <Text style={s.skipText}>Skip · تخطي</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              {!showCrowd && (
                <TouchableOpacity
                  style={s.secondaryBtn}
                  onPress={startScan}
                  activeOpacity={0.8}
                >
                  <Text style={s.secondaryBtnText}>Scan another · مسح آخر</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* Search results */}
          {searchResults.length > 0 && !loading && (
            <>
              <SectionLabel
                text={`${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${searchQ}"`}
              />
              {searchResults.map((drug, i) => (
                <View key={i}>
                  <DrugCard drug={drug} />
                  {drug.found && (
                    <TouchableOpacity
                      style={s.shareBtn}
                      onPress={() => handleShare(drug)}
                      activeOpacity={0.8}
                    >
                      <Text style={s.shareBtnIcon}>📤</Text>
                      <Text style={s.shareBtnText}>
                        Share on WhatsApp · شارك على واتساب
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          )}

          {searchResults.length === 0 &&
            mode === "search" &&
            !loading &&
            searchQ.length > 1 && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>🔍</Text>
                <Text style={s.emptyTitle}>Not found</Text>
                <Text style={s.emptyDesc}>
                  "{searchQ}" isn't in our database yet. Try scanning the
                  barcode instead.
                </Text>
              </View>
            )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <Text style={s.footerText}>
          MoPH data · Not medical advice · بيانات وزارة الصحة
        </Text>
      </View>
    </View>
  );
}

function SectionLabel({ text }) {
  return (
    <View style={s.sectionLabelWrap}>
      <View style={s.sectionLabelDot} />
      <Text style={s.sectionLabel}>{text}</Text>
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  greeting: {
    color: "rgba(255,255,255,0.55)",
    fontSize: F.sm,
    marginBottom: 4,
  },
  headerTitle: { color: C.white, fontSize: F.xl, fontWeight: F.bold },
  settingsBtn: { marginTop: 4 },
  settingsBtnInner: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBtnText: { fontSize: 18, color: C.white },
  pillsWrap: { paddingBottom: 0 },
  pills: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    padding: 3,
    alignSelf: "flex-start",
    marginBottom: 0,
  },
  pill: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 10 },
  pillActive: { backgroundColor: C.white },
  pillText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: F.sm,
    fontWeight: F.medium,
  },
  pillTextActive: { color: C.navy, fontWeight: F.semibold },
  scroll: { flex: 1 },
  body: { padding: 20, paddingBottom: 32 },
  scanIdle: { alignItems: "center", paddingTop: 12 },
  barcodeIllus: {
    width: 180,
    height: 110,
    backgroundColor: C.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.silver,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
    ...S.shadowSm,
  },
  barcodeLines: { flexDirection: "row", alignItems: "center", gap: 2 },
  barcodeLine: { backgroundColor: C.navy, borderRadius: 1 },
  barcodeCornerTL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.teal,
    borderTopLeftRadius: 3,
  },
  barcodeCornerTR: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 14,
    height: 14,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: C.teal,
    borderTopRightRadius: 3,
  },
  barcodeCornerBL: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.teal,
    borderBottomLeftRadius: 3,
  },
  barcodeCornerBR: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 14,
    height: 14,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: C.teal,
    borderBottomRightRadius: 3,
  },
  scanIdleTitle: {
    fontSize: F.xl,
    fontWeight: F.bold,
    color: C.ink2,
    textAlign: "center",
    marginBottom: 6,
  },
  scanIdleSubEn: {
    fontSize: F.sm,
    color: C.slate,
    textAlign: "center",
    marginBottom: 4,
  },
  scanIdleSubAr: {
    fontSize: F.sm,
    color: C.ash,
    textAlign: "center",
    marginBottom: 28,
  },
  scanBtn: {
    flexDirection: "row",
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 10,
  },
  scanBtnDisabled: { opacity: 0.5 },
  scanBtnIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnIconText: { color: C.white, fontSize: 14, fontWeight: F.bold },
  scanBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  searchWrap: { gap: 10 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
    ...S.shadowSm,
  },
  searchIcon: { fontSize: 20, color: C.ash },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: F.md, color: C.ink2 },
  clearText: { color: C.ash, fontSize: F.md, padding: 4 },
  searchSubmitBtn: {
    backgroundColor: C.navy,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
  },
  searchSubmitText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  loadingWrap: { alignItems: "center", paddingVertical: 48 },
  loadingText: { color: C.slate, marginTop: 14, fontSize: F.md },
  loadingTextAr: { color: C.ash, marginTop: 4, fontSize: F.sm },
  sectionLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLabelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.teal,
  },
  sectionLabel: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    backgroundColor: C.white,
  },
  secondaryBtnText: { color: C.charcoal, fontSize: F.md, fontWeight: F.medium },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
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
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#25D366",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  shareBtnIcon: { fontSize: 18 },
  shareBtnText: {
    fontSize: F.sm,
    fontWeight: F.semibold,
    color: C.white,
    flex: 1,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: C.silver,
    marginBottom: 12,
  },
  verifyBtnIcon: { fontSize: 18 },
  verifyBtnText: {
    fontSize: F.sm,
    fontWeight: F.medium,
    color: C.charcoal,
    flex: 1,
  },
  verifyCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 12,
  },
  verifyCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  verifyCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyCardIconText: { color: C.white, fontSize: F.md, fontWeight: F.bold },
  verifyCardTitle: { fontSize: F.md, fontWeight: F.bold },
  verifyCardConf: { fontSize: F.xs, marginTop: 2, opacity: 0.75 },
  verifyFlags: { gap: 4, marginBottom: 10 },
  verifyFlag: {
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  verifyFlagText: { fontSize: F.xs, color: C.charcoal },
  verifyExpl: { fontSize: F.sm, lineHeight: 20, opacity: 0.85 },
  crowdCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.teal,
    padding: 20,
    marginBottom: 16,
    ...S.shadow,
  },
  crowdHeader: { marginBottom: 16 },
  crowdBadge: {
    backgroundColor: C.tealBg,
    borderRadius: S.full,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  crowdBadgeText: {
    color: C.tealText,
    fontSize: F.xs,
    fontWeight: F.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  crowdTitle: {
    fontSize: F.lg,
    fontWeight: F.bold,
    color: C.ink2,
    marginBottom: 6,
  },
  crowdDesc: { fontSize: F.sm, color: C.slate, lineHeight: 20 },
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
  confirmBtn: {
    backgroundColor: C.teal,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 14,
  },
  confirmBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
  skipLink: { alignItems: "center", marginTop: 12 },
  skipText: { fontSize: F.sm, color: C.ash, textDecorationLine: "underline" },
  crowdSuccess: { alignItems: "center", gap: 12 },
  crowdSuccessRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.tealBg,
    borderWidth: 2,
    borderColor: C.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  crowdSuccessIcon: { fontSize: 24, color: C.teal },
  crowdSuccessTitle: { fontSize: F.xl, fontWeight: F.bold, color: C.ink2 },
  crowdSuccessDesc: {
    fontSize: F.sm,
    color: C.slate,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderColor: C.silver,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  footerText: { fontSize: F.xs, color: C.ash, textAlign: "center" },
});
