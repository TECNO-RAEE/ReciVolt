import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { colors, fonts } from '@/theme';

type ScannerLookupViewProps = {
  readonly camera: boolean;
  readonly permissionGranted: boolean;
  readonly onMountError: () => void;
  readonly onBarcodeScanned: (data: string) => void;
  readonly onToggleCamera: () => void;
  readonly onCloseCamera: () => void;
  readonly code: string;
  readonly onChangeCode: (val: string) => void;
  readonly onClearCode: () => void;
  readonly onSearch: () => void;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly notice?: string | null;
};

export function ScannerLookupView({
  camera,
  permissionGranted,
  onMountError,
  onBarcodeScanned,
  onToggleCamera,
  onCloseCamera,
  code,
  onChangeCode,
  onClearCode,
  onSearch,
  busy,
  error,
  notice,
}: ScannerLookupViewProps) {
  return (
    <>
      {/* Cámara con marco y esquinas de visor de escáner */}
      <View style={styles.viewfinderCard}>
        <View style={styles.cameraBox}>
          {camera && permissionGranted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
              onMountError={onMountError}
              onBarcodeScanned={({ data }) => onBarcodeScanned(data)}
            />
          ) : (
            <View style={styles.cameraPlaceholder}>
              <View style={styles.qrArtworkCircle}>
                <Ionicons name="qr-code-outline" size={64} color={colors.primaryDark} />
              </View>
              <Text style={styles.cameraInstructions}>
                Escaneá el código de entrega o canje
              </Text>
              <Text style={styles.cameraHint}>
                Apuntá la cámara al código presentado por el ciudadano.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir cámara del dispositivo"
                style={styles.cameraToggleBtn}
                onPress={onToggleCamera}
              >
                <Ionicons name="camera-outline" size={20} color={colors.textOnPrimary} />
                <Text style={styles.cameraToggleBtnText}>Abrir cámara</Text>
              </Pressable>
            </View>
          )}

          {/* Esquinas verdes del visor de escáner */}
          <View style={styles.cornerTopLeft} pointerEvents="none" />
          <View style={styles.cornerTopRight} pointerEvents="none" />
          <View style={styles.cornerBottomLeft} pointerEvents="none" />
          <View style={styles.cornerBottomRight} pointerEvents="none" />
        </View>

        {camera && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar cámara"
            style={styles.closeCameraBtn}
            onPress={onCloseCamera}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
            <Text style={styles.closeCameraText}>Cerrar visor de cámara</Text>
          </Pressable>
        )}
      </View>

      {/* Separador con "o" */}
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>o</Text>
        <View style={styles.orLine} />
      </View>

      {/* Ingreso manual de código */}
      <View style={styles.manualEntryCard}>
        <Text style={styles.fieldLabel}>Ingresar código manual</Text>
        <View style={styles.inputBox}>
          <Ionicons name="barcode-outline" size={22} color={colors.textSecondary} />
          <TextInput
            style={styles.manualInput}
            placeholder="TR-… o código manual"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={onChangeCode}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
          />
          {code.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Borrar código ingresado"
              style={styles.clearBtn}
              onPress={onClearCode}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <ActionButton
          title="Buscar"
          loading={busy}
          disabled={!code.trim()}
          onPress={onSearch}
        />
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  viewfinderCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  cameraBox: {
    width: '100%',
    height: 280,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  qrArtworkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cameraInstructions: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  cameraHint: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  cameraToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 12,
    marginTop: 8,
  },
  cameraToggleBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textOnPrimary,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.accent,
    borderTopLeftRadius: 8,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
    borderTopRightRadius: 8,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: colors.accent,
    borderBottomLeftRadius: 8,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 32,
    height: 32,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: colors.accent,
    borderBottomRightRadius: 8,
  },
  closeCameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  closeCameraText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  manualEntryCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingLeft: 12,
    minHeight: 48,
    gap: 10,
  },
  manualInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  clearBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  noticeText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primaryDark,
    textAlign: 'center',
  },
});
