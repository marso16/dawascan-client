import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  Linking,
  Modal,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";
import axios from "axios";
import { supabase, API_URL } from "../supabase";
import { C, F, S } from "../theme";

// Fetch pharmacies from OpenStreetMap Overpass API
async function fetchNearbyPharmacies(lat, lng, radiusKm = 3) {
  const radius = radiusKm * 1000;
  const query = `[out:json][timeout:25];(node["amenity"="pharmacy"](around:${radius},${lat},${lng});way["amenity"="pharmacy"](around:${radius},${lat},${lng}););out center tags;`;
  const params = new URLSearchParams();
  params.append("data", query);
  const res = await axios.post(
    "https://overpass-api.de/api/interpreter",
    params.toString(),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 30000,
    },
  );
  return res.data.elements
    .map((el) => ({
      osm_id: String(el.id),
      name: el.tags?.name || el.tags?.["name:ar"] || "Pharmacy",
      lat: el.lat || el.center?.lat,
      lng: el.lon || el.center?.lon,
      phone: el.tags?.phone || el.tags?.["contact:phone"] || null,
      address: el.tags?.["addr:street"] || el.tags?.["addr:full"] || null,
    }))
    .filter((p) => p.lat && p.lng);
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function PharmacyMapScreen({ navigation }) {
  const mapRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [availLoading, setAvailLoading] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportQ, setReportQ] = useState("");
  const [reportResults, setReportResults] = useState([]);
  const [reportDrug, setReportDrug] = useState(null);
  const [reportStatus, setReportStatus] = useState("available");
  const [reportSearchLoading, setReportSearchLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initLocation();
  }, []);

  async function initLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationError(true);
      setLoading(false);
      return;
    }
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = loc.coords;
    setLocation({ latitude, longitude });

    try {
      const pharmas = await fetchNearbyPharmacies(latitude, longitude);
      // Sort by distance
      const sorted = pharmas.sort(
        (a, b) =>
          distanceKm(latitude, longitude, a.lat, a.lng) -
          distanceKm(latitude, longitude, b.lat, b.lng),
      );
      setPharmacies(sorted);
    } catch (e) {
      Alert.alert(
        "Error",
        "Could not load nearby pharmacies. Check your internet connection.",
      );
    }
    setLoading(false);
  }

  async function selectPharmacy(pharmacy) {
    setSelected(pharmacy);
    setAvailLoading(true);
    setAvailability([]);

    // Load availability reports for this pharmacy
    const { data } = await supabase
      .from("pharmacy_availability")
      .select("trade_name, status, reported_at")
      .eq("pharmacy_osm_id", pharmacy.osm_id)
      .order("reported_at", { ascending: false })
      .limit(20);

    // Deduplicate by drug — keep most recent report per drug
    const seen = {};
    for (const row of data || []) {
      if (!seen[row.trade_name]) seen[row.trade_name] = row;
    }
    setAvailability(Object.values(seen));
    setAvailLoading(false);

    // Fly to pharmacy
    mapRef.current?.animateToRegion(
      {
        latitude: pharmacy.lat,
        longitude: pharmacy.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      600,
    );
  }

  async function searchReportDrug(q) {
    setReportQ(q);
    setReportDrug(null);
    if (q.length < 2) {
      setReportResults([]);
      return;
    }
    setReportSearchLoading(true);
    try {
      const res = await axios.get(`${API_URL}/drugs/search`, {
        params: { q, limit: 5 },
      });
      setReportResults(res.data);
    } catch {
      setReportResults([]);
    } finally {
      setReportSearchLoading(false);
    }
  }

  async function submitReport() {
    if (!reportDrug || !selected) return;
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await supabase.from("pharmacy_availability").insert({
        pharmacy_osm_id: selected.osm_id,
        pharmacy_name: selected.name,
        pharmacy_lat: selected.lat,
        pharmacy_lng: selected.lng,
        drug_id: reportDrug.id || null,
        trade_name: reportDrug.trade_name,
        status: reportStatus,
        reported_by: user?.id || null,
      });
      Alert.alert(
        "Thank you!",
        `Report submitted for ${reportDrug.trade_name} at ${selected.name}.`,
      );
      setReportModal(false);
      setReportQ("");
      setReportResults([]);
      setReportDrug(null);
      selectPharmacy(selected); // refresh availability
    } catch {
      Alert.alert("Error", "Could not submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(iso) {
    const d = new Date(iso);
    const diffH = Math.floor((Date.now() - d) / 3600000);
    const diffD = Math.floor((Date.now() - d) / 86400000);
    if (diffH < 1) return "Just now";
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  if (locationError) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={s.backBtn}
          >
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Pharmacy map</Text>
        </View>
        <View style={s.centerWrap}>
          <Text style={s.emptyEmoji}>📍</Text>
          <Text style={s.emptyTitle}>Location needed</Text>
          <Text style={s.emptyDesc}>
            Please allow location access to find pharmacies near you.
          </Text>
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => Linking.openSettings()}
            activeOpacity={0.85}
          >
            <Text style={s.primaryBtnText}>Open settings</Text>
          </TouchableOpacity>
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
          <Text style={s.headerTitle}>Pharmacy map</Text>
          <Text style={s.headerTitleAr}>خريطة الصيدليات</Text>
        </View>
        {location && (
          <TouchableOpacity
            style={s.locateBtn}
            onPress={() => {
              mapRef.current?.animateToRegion(
                {
                  ...location,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                },
                600,
              );
            }}
          >
            <Text style={s.locateBtnText}>⊙</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.centerWrap}>
          <ActivityIndicator size="large" color={C.teal} />
          <Text style={s.loadingText}>Finding pharmacies near you…</Text>
          <Text style={s.loadingTextAr}>جارٍ البحث عن الصيدليات القريبة</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Map */}
          <MapView
            ref={mapRef}
            style={s.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={
              location
                ? {
                    ...location,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }
                : undefined
            }
            showsUserLocation
            showsMyLocationButton={false}
          >
            {pharmacies.map((p) => (
              <Marker
                key={p.osm_id}
                coordinate={{ latitude: p.lat, longitude: p.lng }}
                onPress={() => selectPharmacy(p)}
                pinColor={selected?.osm_id === p.osm_id ? C.teal : C.navy}
              />
            ))}
          </MapView>

          {/* Pharmacy count badge */}
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>
              {pharmacies.length} pharmacies nearby
            </Text>
          </View>

          {/* Selected pharmacy panel */}
          {selected && (
            <View style={s.panel}>
              <View style={s.panelHeader}>
                <View style={s.panelIcon}>
                  <Text style={s.panelIconText}>💊</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.panelName} numberOfLines={1}>
                    {selected.name}
                  </Text>
                  {selected.address && (
                    <Text style={s.panelAddress} numberOfLines={1}>
                      {selected.address}
                    </Text>
                  )}
                  {location && (
                    <Text style={s.panelDist}>
                      {distanceKm(
                        location.latitude,
                        location.longitude,
                        selected.lat,
                        selected.lng,
                      ).toFixed(1)}{" "}
                      km away
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelected(null)}
                  style={s.closeBtn}
                >
                  <Text style={s.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={s.panelActions}>
                {selected.phone && (
                  <TouchableOpacity
                    style={s.actionBtn}
                    onPress={() => Linking.openURL(`tel:${selected.phone}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.actionBtnText}>📞 Call</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() =>
                    Linking.openURL(
                      `https://maps.google.com/?q=${selected.lat},${selected.lng}`,
                    )
                  }
                  activeOpacity={0.8}
                >
                  <Text style={s.actionBtnText}>🗺 Directions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionBtnPrimary]}
                  onPress={() => setReportModal(true)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.actionBtnText, { color: C.white }]}>
                    + Report
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Drug availability */}
              <Text style={s.availTitle}>Drug availability · توفر الأدوية</Text>
              {availLoading ? (
                <ActivityIndicator
                  size="small"
                  color={C.teal}
                  style={{ marginVertical: 12 }}
                />
              ) : availability.length === 0 ? (
                <Text style={s.availEmpty}>
                  No reports yet. Be the first to report!
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ gap: 6 }}>
                    {availability.map((item, i) => (
                      <View key={i} style={s.availRow}>
                        <View
                          style={[
                            s.availDot,
                            {
                              backgroundColor:
                                item.status === "available"
                                  ? C.success
                                  : C.danger,
                            },
                          ]}
                        />
                        <Text style={s.availDrug}>{item.trade_name}</Text>
                        <Text style={s.availStatus}>
                          {item.status === "available"
                            ? "✓ Available"
                            : "✕ Not available"}
                        </Text>
                        <Text style={s.availTime}>
                          {formatTime(item.reported_at)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {/* Report Modal */}
      <Modal
        visible={reportModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Report drug availability</Text>
            <TouchableOpacity
              onPress={() => {
                setReportModal(false);
                setReportQ("");
                setReportResults([]);
                setReportDrug(null);
              }}
            >
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={s.modalBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.modalPharmacy}>At: {selected?.name}</Text>

            {/* Status toggle */}
            <Text style={s.fieldLabel}>What are you reporting?</Text>
            <View style={s.toggleWrap}>
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
                  ✓ Drug available
                </Text>
              </TouchableOpacity>
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
                  ✕ Not available
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
                value={reportQ}
                onChangeText={searchReportDrug}
                autoCorrect={false}
              />
            </View>

            {reportSearchLoading && (
              <ActivityIndicator
                size="small"
                color={C.teal}
                style={{ marginTop: 10 }}
              />
            )}

            {reportResults.length > 0 && !reportSearchLoading && (
              <View style={s.suggestList}>
                {reportResults.map((drug, i) => {
                  const sel = reportDrug?.trade_name === drug.trade_name;
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[s.suggestItem, sel && s.suggestItemSelected]}
                      onPress={() => {
                        setReportDrug(sel ? null : drug);
                        setReportResults([]);
                        setReportQ(sel ? "" : drug.trade_name);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[s.suggestName, sel && { color: C.tealText }]}
                        >
                          {drug.trade_name}
                        </Text>
                        <Text style={[s.suggestSci, sel && { color: C.teal }]}>
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

            <TouchableOpacity
              style={[
                s.primaryBtn,
                { marginTop: 24 },
                (!reportDrug || submitting) && s.primaryBtnDisabled,
              ]}
              onPress={submitReport}
              disabled={!reportDrug || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={s.primaryBtnText}>
                  Submit report{reportDrug ? ` — ${reportDrug.trade_name}` : ""}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.snow },
  header: {
    backgroundColor: C.navy,
    paddingTop: Platform.OS === "android" ? 44 : 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  backBtn: { marginRight: 12 },
  backText: { color: "rgba(255,255,255,0.5)", fontSize: F.md },
  headerTitle: { color: C.white, fontSize: F.xl, fontWeight: F.bold },
  headerTitleAr: {
    color: "rgba(255,255,255,0.4)",
    fontSize: F.sm,
    marginTop: 2,
  },
  locateBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  locateBtnText: { color: C.teal, fontSize: 20 },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  loadingText: { color: C.slate, marginTop: 14, fontSize: F.md },
  loadingTextAr: { color: C.ash, marginTop: 4, fontSize: F.sm },
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
  map: { flex: 1 },
  countBadge: {
    position: "absolute",
    top: 12,
    alignSelf: "center",
    backgroundColor: C.navy,
    borderRadius: S.full,
    paddingVertical: 6,
    paddingHorizontal: 16,
    ...S.shadow,
  },
  countBadgeText: { color: C.white, fontSize: F.xs, fontWeight: F.semibold },
  panel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "55%",
    ...S.shadowLg,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  panelIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: C.tealBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  panelIconText: { fontSize: 22 },
  panelName: { fontSize: F.lg, fontWeight: F.bold, color: C.ink2 },
  panelAddress: { fontSize: F.sm, color: C.slate, marginTop: 2 },
  panelDist: {
    fontSize: F.xs,
    color: C.teal,
    marginTop: 3,
    fontWeight: F.semibold,
  },
  closeBtn: { padding: 4 },
  closeBtnText: { color: C.ash, fontSize: F.md },
  panelActions: { flexDirection: "row", gap: 8, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    backgroundColor: C.snow,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.silver,
  },
  actionBtnPrimary: { backgroundColor: C.navy, borderColor: C.navy },
  actionBtnText: { fontSize: F.sm, fontWeight: F.semibold, color: C.charcoal },
  availTitle: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  availEmpty: {
    fontSize: F.sm,
    color: C.ash,
    fontStyle: "italic",
    marginBottom: 8,
  },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderColor: C.mist,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availDrug: { fontSize: F.sm, fontWeight: F.semibold, color: C.ink2, flex: 1 },
  availStatus: { fontSize: F.xs, color: C.slate },
  availTime: { fontSize: F.xs, color: C.ash },
  modal: { flex: 1, backgroundColor: C.white },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderColor: C.silver,
    paddingTop: Platform.OS === "ios" ? 56 : 20,
  },
  modalTitle: { fontSize: F.lg, fontWeight: F.bold, color: C.ink2 },
  modalClose: { color: C.ash, fontSize: F.lg, padding: 4 },
  modalBody: { padding: 20, paddingBottom: 48 },
  modalPharmacy: {
    fontSize: F.sm,
    color: C.slate,
    marginBottom: 20,
    fontStyle: "italic",
  },
  fieldLabel: {
    fontSize: F.xs,
    fontWeight: F.semibold,
    color: C.slate,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 16,
  },
  toggleWrap: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: C.silver,
  },
  toggleBtnSuccess: { backgroundColor: C.successBg, borderColor: "#6EE7B7" },
  toggleBtnDanger: { backgroundColor: C.dangerBg, borderColor: "#FCA5A5" },
  toggleBtnText: { fontSize: F.sm, fontWeight: F.semibold, color: C.slate },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.snow,
    borderWidth: 1.5,
    borderColor: C.silver,
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchIcon: { fontSize: 20, color: C.ash },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: F.md, color: C.ink2 },
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
  primaryBtnText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
});
