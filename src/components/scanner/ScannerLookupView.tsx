import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { PortalFeedback } from '@/components/portal/PortalUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { fonts, motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

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
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
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
                Escaneá el código de entrega, retiro o canje
              </Text>
              <Text style={styles.cameraHint}>
                Apuntá la cámara al código presentado por el ciudadano.
              </Text>
              <View style={styles.cameraBtnWrap}>
                <ActionButton
                  title="Abrir cámara"
                  icon={<Ionicons name="camera-outline" size={20} color={colors.textOnPrimary} />}
                  disabled={busy}
                  onPress={onToggleCamera}
                />
              </View>
            </View>
          )}

          {/* Esquinas verdes del visor de escáner */}
          <View style={styles.cornerTopLeft} pointerEvents="none" />
          <View style={styles.cornerTopRight} pointerEvents="none" />
          <View style={styles.cornerBottomLeft} pointerEvents="none" />
          <View style={styles.cornerBottomRight} pointerEvents="none" />
        </View>

        {camera && (
          <View style={styles.closeCameraWrap}>
            <ActionButton
              title="Cerrar visor de cámara"
              secondary
              disabled={busy}
              onPress={onCloseCamera}
            />
          </View>
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
            accessibilityLabel="Ingresar código manual"
            style={styles.manualInput}
            placeholder="TR-… o TRR-…"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={onChangeCode}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (code.trim() && !busy) onSearch();
            }}
            editable={!busy}
          />
          {code.length > 0 && (
            <SpringPressable
              accessibilityRole="button"
              accessibilityLabel="Borrar código ingresado"
              pressScale={motion.scale.icon}
              style={styles.clearBtn}
              onPress={onClearCode}
            >
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </SpringPressable>
          )}
        </View>

        <PortalFeedback error={error} notice={notice} />

        <ActionButton title="Buscar" loading={busy} disabled={!code.trim()} onPress={onSearch} />
      </View>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
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
    cameraBtnWrap: {
      marginTop: 8,
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
    closeCameraWrap: {
      width: '100%',
      marginTop: 12,
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
      borderColor: colors.borderControl,
      borderRadius: 12,
      paddingLeft: 12,
      minHeight: 48,
      gap: 10,
    },
    manualInput: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 10,
    },
    clearBtn: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
