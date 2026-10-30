import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import type { Redemption } from '@/models/Reward';
import { colors, fonts } from '@/theme';

type RedemptionConfirmationViewProps = {
  readonly redemption: Redemption;
  readonly companyName: string;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly onConfirmRedemption: () => void;
  readonly onReset: () => void;
};

export function RedemptionConfirmationView({
  redemption,
  companyName,
  busy,
  error,
  onConfirmRedemption,
  onReset,
}: RedemptionConfirmationViewProps) {
  const isRedemptionReserved = redemption.status === 'RESERVED';

  return (
    <>
      {/* Card: Comercio asociado */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="storefront-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardSubtitle}>Comercio emisor</Text>
            <Text style={styles.cardTitle}>
              {redemption.reward.businessName || companyName}
            </Text>
          </View>
        </View>
      </View>

      {/* Card: Premio y estado */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="gift-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>{redemption.reward.title}</Text>
            {redemption.reward.description ? (
              <Text style={styles.cardSubtitle}>{redemption.reward.description}</Text>
            ) : null}
          </View>
          <View
            style={[
              styles.statusBadge,
              !isRedemptionReserved && { backgroundColor: colors.surfaceSoft },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                !isRedemptionReserved && { color: colors.textSecondary },
              ]}
            >
              {isRedemptionReserved ? 'Reservado' : 'Entregado'}
            </Text>
          </View>
        </View>
      </View>

      {/* Card: Datos del ciudadano */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceSoft }]}>
            <Ionicons name="person" size={22} color={colors.primary} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardSubtitle}>Beneficiario</Text>
            <Text style={styles.cardTitle}>{redemption.citizenName}</Text>
          </View>
          <View style={styles.codePill}>
            <Text style={styles.codePillText}>{redemption.code}</Text>
          </View>
        </View>
      </View>

      {/* Callout explicativo de puntos */}
      <View style={styles.rewardCallout}>
        <Ionicons name="checkmark-circle-outline" size={22} color={colors.primaryDark} />
        <View style={styles.cardTextCol}>
          <Text style={styles.rewardCalloutTitle}>
            {redemption.pointsCost.toLocaleString('es-AR')} puntos ya descontados
          </Text>
          <Text style={styles.rewardCalloutSubtitle}>
            Los puntos se descontaron al momento de la reserva. Esta validación confirma la
            entrega física del premio sin volver a descontar saldo.
          </Text>
        </View>
      </View>

      {/* Aviso de exclusividad para personal autorizado */}
      <View style={styles.operatorNoticeCard}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.operatorNoticeText}>
          Solo personal autorizado del comercio debe confirmar la entrega física del beneficio.
        </Text>
      </View>

      {error ? (
        <Text accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}

      {/* Acciones */}
      <View style={styles.actionCol}>
        {isRedemptionReserved ? (
          <ActionButton
            title="Confirmar entrega del premio"
            loading={busy}
            onPress={onConfirmRedemption}
          />
        ) : null}
        <ActionButton
          title="Escanear otro código"
          secondary={isRedemptionReserved}
          disabled={busy}
          onPress={onReset}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.primaryDark,
  },
  codePill: {
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codePillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.text,
    letterSpacing: 0.5,
  },
  rewardCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  rewardCalloutTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  rewardCalloutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  operatorNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  operatorNoticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textSecondary,
  },
  actionCol: {
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
});
