import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView } from "expo-camera";
import { C, F, S } from "../theme";

export default function BarcodeScanner({ onScan, onCancel }) {
  return (
    <View style={s.wrap}>
      <CameraView
        style={s.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["ean13", "ean8", "qr", "code128"],
        }}
        onBarcodeScanned={onScan}
      />

      {/* Dark overlay with cutout feel */}
      <View style={s.overlay}>
        {/* Top dark area */}
        <View style={s.overlayTop} />

        {/* Middle row */}
        <View style={s.overlayMid}>
          <View style={s.overlaySide} />

          {/* Scan frame */}
          <View style={s.frame}>
            <View style={[s.corner, s.cornerTL]} />
            <View style={[s.corner, s.cornerTR]} />
            <View style={[s.corner, s.cornerBL]} />
            <View style={[s.corner, s.cornerBR]} />
            {/* Scan line */}
            <View style={s.scanLine} />
          </View>

          <View style={s.overlaySide} />
        </View>

        {/* Bottom dark area */}
        <View style={s.overlayBottom}>
          <Text style={s.hint}>Point at the barcode on the drug box</Text>
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={s.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const FRAME_W = 260;
const FRAME_H = 160;

const s = StyleSheet.create({
  wrap: { width: "100%", height: 380, borderRadius: 20, overflow: "hidden" },
  camera: { ...StyleSheet.absoluteFillObject },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
  overlayTop: { flex: 1, backgroundColor: "rgba(10,22,40,0.72)" },
  overlayMid: { flexDirection: "row", height: FRAME_H },
  overlaySide: { flex: 1, backgroundColor: "rgba(10,22,40,0.72)" },
  overlayBottom: {
    flex: 1.2,
    backgroundColor: "rgba(10,22,40,0.72)",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  frame: { width: FRAME_W, height: FRAME_H, position: "relative" },
  corner: { position: "absolute", width: 22, height: 22 },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.teal,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: C.teal,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: C.teal,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: C.teal,
    borderBottomRightRadius: 4,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: C.teal,
    opacity: 0.8,
    borderRadius: 1,
  },
  hint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: F.sm,
    textAlign: "center",
  },
  cancelBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: S.full,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cancelText: { color: C.white, fontSize: F.md, fontWeight: F.semibold },
});
