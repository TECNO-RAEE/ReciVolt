import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import { InfoNote } from '@/components/rewards/RewardsUI';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { colors, fonts } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

export default function DeviceUnacceptedScreen() {
  const scroll = useScrollReset();
  const { pointId } = useLocalSearchParams<{ pointId?: string }>();
  const { points } = useDiscovery();
  const [search, setSearch] = useState('');
  const point = points.find((item) => item.id === pointId);
  const rejected = useMemo(
    () =>
      (point?.intakePolicies ?? [])
        .filter((policy) => policy.mode === 'not_accepted' && policy.category)
        .filter((policy) => normalize(policy.category!.name).includes(normalize(search)))
        .sort((a, b) => a.category!.name.localeCompare(b.category!.name, 'es')),
    [point?.intakePolicies, search]
  );
  return (
    <View style={styles.container}>
      <ScreenHeader title="Qué no recibimos" back={pointId ? `/point/${pointId}` : '/profile'} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>{point?.name ?? 'Política de recepción por punto'}</Text>
        <View style={styles.search}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            accessibilityLabel="Buscar en el listado"
            placeholder="Buscar en el listado"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>
        {!point ? (
          <>
            <InfoNote>
              La lista depende del punto verde. Abrí el detalle de un punto para consultar su
              política.
            </InfoNote>
            <ActionButton
              title="Buscar puntos verdes"
              onPress={() => router.push('/green-points')}
            />
          </>
        ) : !point.intakeConfirmed ? (
          <>
            <View style={styles.warning}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.danger} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.warningTitle}>Información pendiente de confirmar</Text>
                <Text style={styles.body}>
                  Consultá con el punto antes de acercar un dispositivo.
                </Text>
              </View>
            </View>
            {rejected.length === 0 && (
              <Text style={styles.body}>
                Este punto todavía no confirmó qué dispositivos no recibe.
              </Text>
            )}
            {rejected.map((policy) => (
              <View key={policy.categoryId} style={styles.row}>
                <View style={styles.rejectedIcon}>
                  <Ionicons name="close-circle-outline" size={23} color={colors.danger} />
                </View>
                <Text style={styles.body}>{policy.category!.name}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <View style={styles.warning}>
              <Ionicons name="ban-outline" size={24} color={colors.danger} />
              <Text style={styles.warningTitle}>Residuos no recibidos por este punto</Text>
            </View>
            {rejected.length ? (
              rejected.map((policy) => (
                <View key={policy.categoryId} style={styles.row}>
                  <View style={styles.rejectedIcon}>
                    <Ionicons name="close-circle-outline" size={23} color={colors.danger} />
                  </View>
                  <Text style={styles.body}>{policy.category!.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              ))
            ) : (
              <Text style={styles.body}>
                {search
                  ? 'No encontramos residuos con esa búsqueda.'
                  : 'Este punto no registró dispositivos excluidos.'}
              </Text>
            )}
          </>
        )}
        <View style={styles.caution}>
          <Ionicons name="information-circle-outline" size={22} color={colors.danger} />
          <Text style={styles.body}>
            No acerques pilas, baterías ni residuos especiales sin confirmar cómo gestionarlos.
            Consultá un canal habilitado para su tratamiento.
          </Text>
        </View>
        {point?.phone ? (
          <ActionButton
            title="Consultar por teléfono"
            secondary
            onPress={() => void Linking.openURL(`tel:${point.phone!.replace(/[^+\d]/g, '')}`)}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    padding: 24,
    gap: 16,
    paddingBottom: 40,
  },
  subtitle: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.text },
  body: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  search: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  warning: {
    backgroundColor: colors.dangerBackground,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.text,
  },
  rejectedIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.dangerBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 68,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  caution: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.dangerBackground,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
});
