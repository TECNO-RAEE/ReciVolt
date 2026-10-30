import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { colors, fonts } from '@/theme';

type ScannerHelpModalProps = {
  readonly visible: boolean;
  readonly onClose: () => void;
};

export function ScannerHelpModal({ visible, onClose }: ScannerHelpModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.helpModalCard} onStartShouldSetResponder={() => true}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.helpModalTitle}>¿Cómo validar códigos?</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar ayuda"
              style={styles.modalCloseBtn}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.helpModalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>1</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Escanear código QR</Text>
                <Text style={styles.helpItemBody}>
                  Apuntá la cámara al código presentado por el ciudadano en su pantalla o comprobante impreso.
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>2</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Ingreso manual de respaldo</Text>
                <Text style={styles.helpItemBody}>
                  Si la cámara no está disponible o el código no se lee, podés tipear el código alfanumérico que empieza con TR-…
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>3</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Verificación física y ajuste</Text>
                <Text style={styles.helpItemBody}>
                  Contá las unidades reales recibidas. Podés aumentar o reducir las cantidades con los botones + y −. Si alguna categoría no llegó, ajustala a 0.
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpStepBadge}>
                <Text style={styles.helpStepBadgeText}>4</Text>
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.helpItemTitle}>Acreditación y premios</Text>
                <Text style={styles.helpItemBody}>
                  Los puntos de entrega se acreditan de inmediato al confirmar. En los canjes de beneficios, los puntos ya fueron descontados previamente.
                </Text>
              </View>
            </View>
          </ScrollView>

          <ActionButton title="Entendido" onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  helpModalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.brandDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helpModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpModalScroll: {
    maxHeight: 340,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  helpStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  helpStepBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primaryDark,
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
  helpItemTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  helpItemBody: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
