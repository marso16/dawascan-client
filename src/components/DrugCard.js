import { View, Text, StyleSheet } from "react-native";
import { C, F, S } from "../theme";

const VERDICT = {
  registered: {
    bg: C.successBg,
    text: C.successText,
    icon: "✓",
    label: "Registered with MoPH",
  },
  not_found: {
    bg: C.warnBg,
    text: C.warnText,
    icon: "?",
    label: "Not in our database yet",
  },
  cancelled: {
    bg: C.dangerBg,
    text: C.dangerText,
    icon: "✕",
    label: "Cancelled by MoPH",
  },
  suspended: {
    bg: C.dangerBg,
    text: C.dangerText,
    icon: "⚠",
    label: "Registration suspended",
  },
  unknown: { bg: C.mist, text: C.slate, icon: "·", label: "Status unknown" },
};

export default function DrugCard({ drug }) {
  const v = VERDICT[drug.verdict] || VERDICT.unknown;

  return (
    <View style={s.card}>
      {/* Verdict strip */}
      <View style={[s.verdictStrip, { backgroundColor: v.bg }]}>
        <View style={[s.verdictDot, { backgroundColor: v.text }]}>
          <Text style={s.verdictDotText}>{v.icon}</Text>
        </View>
        <Text style={[s.verdictLabel, { color: v.text }]}>{v.label}</Text>
      </View>

      {drug.found ? (
        <View style={s.body}>
          {/* Drug name */}
          <Text style={s.name}>{drug.trade_name}</Text>
          {drug.scientific_name ? (
            <Text style={s.sci}>{drug.scientific_name}</Text>
          ) : null}

          {/* Divider */}
          <View style={s.divider} />

          {/* Info rows */}
          <InfoRow label="MoPH Code" value={drug.moph_code} mono />
          <InfoRow label="Form" value={drug.dosage_form} />
          <InfoRow label="Strength" value={drug.strength} />
          <InfoRow label="Manufacturer" value={drug.manufacturer} />
          <InfoRow label="Country" value={drug.country_origin} />
          {drug.price_usd ? (
            <InfoRow label="Price" value={`$${drug.price_usd} USD`} accent />
          ) : null}

          {/* Detail message */}
          <View style={s.detailBox}>
            <Text style={s.detailText}>{drug.verdict_detail}</Text>
          </View>
        </View>
      ) : (
        <View style={s.body}>
          <Text style={s.detailText}>{drug.verdict_detail}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ label, value, mono, accent }) {
  if (!value) return null;
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text
        style={[
          s.rowValue,
          mono && { fontFamily: "monospace", fontSize: F.xs },
          accent && { color: C.teal, fontWeight: F.semibold },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.silver,
    marginBottom: 16,
    ...S.shadow,
  },
  verdictStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  verdictDot: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  verdictDotText: { color: C.white, fontSize: F.sm, fontWeight: F.bold },
  verdictLabel: { fontSize: F.sm, fontWeight: F.semibold, flex: 1 },
  body: { padding: 18 },
  name: {
    fontSize: F.xxl,
    fontWeight: F.extrabold,
    color: C.ink2,
    letterSpacing: -0.5,
  },
  sci: { fontSize: F.sm, color: C.slate, marginTop: 3, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: C.silver, marginVertical: 14 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderColor: C.mist,
  },
  rowLabel: { fontSize: F.sm, color: C.ash, flex: 1 },
  rowValue: {
    fontSize: F.sm,
    color: C.charcoal,
    fontWeight: F.medium,
    flex: 2,
    textAlign: "right",
  },
  detailBox: {
    backgroundColor: C.snow,
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: C.silver,
  },
  detailText: { fontSize: F.sm, color: C.slate, lineHeight: 20 },
});
