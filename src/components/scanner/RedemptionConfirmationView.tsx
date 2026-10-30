import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { CodePill, InfoCard } from '@/components/ui/InfoCard';
import type { Redemption } from '@/models/Reward';
import { colors, fonts } from '@/theme';

type RedemptionConfirmationViewProps = {
  readonly redemption: Redemption;
  readonly companyName: string;
  readonly busy: boolean;
  readonly error?: string | null;
  readonly notice?: string | null;
  readonly onConfirmRedemption: () => void;
  readonly onRefresh: () => void;
  readonly onReset: () => void;
};

export function RedemptionConfirmationView({
  redemption,
  companyName,
  busy,
  error,
  notice,
  onConfirmRedemption,
  onRefresh,
  onReset,
}: RedemptionConfirmationViewProps) {
  const isRedemptionReserved = redemption.status === 'RESERVED';

  const statusBadge = (
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
  );

  return (
    <>
      {/* Card: Comercio asociado */}
      <InfoCard
        icon={{ name: 'storefront-outline', color: colors.primaryDark }}
        subtitleFirst
        subtitle="Comercio emisor"
        title={redemption.reward.businessName || companyName}
      />

      {/* Card: Premio y estado */}
      <InfoCard
        icon={{ name: 'gift-outline', color: colors.primary, backgroundColor: colors.primarySoft }}
        title={redemption.reward.title}
        subtitle={redemption.reward.description}
        right={statusBadge}
      />

      {/* Card: Datos del ciudadano */}
      <InfoCard
        icon={{ name: 'person', color: colors.primary, backgroundColor: colors.surfaceSoft }}
        subtitleFirst
        subtitle="Beneficiario"
        title={redemption.citizenName}
        right={<CodePill code={redemption.code} />}
      />

      {/* Callout explicativo de puntos */}
      <InfoCard
        variant="highlight"
        icon={{ name: 'checkmark-circle-outline', color: colors.primaryDark }}
        title={`${redemption.pointsCost.toLocaleString('es-AR')} puntos ya descontados`}
        subtitle="Los puntos se descontaron al momento de la reserva. Esta validación confirma la entrega física del premio sin volver a descontar saldo."
      />

      {/* Aviso de exclusividad para personal autorizado */}
      <View style={styles.operatorNoticeCard}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
        <Text style={styles.operatorNoticeText}>
          Solo personal autorizado del comercio debe confirmar la entrega física del beneficio.
        </Text>
      </View>

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

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Consultar de nuevo el estado original del código"
          style={styles.refreshLinkBtn}
          disabled={busy}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={16} color={colors.textSecondary} />
          <Text style={styles.refreshLinkText}>Consultar estado original del código</Text>
        </Pressable>
      </View>

      {/* Mensajes de error y notice siempre visibles */}
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
  refreshLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  refreshLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
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
