import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { SearchBar } from '@/components/discovery/SearchBar';
import { ActionButton } from '@/components/ui/ActionButton';
import { CitizenPage, InfoNote } from '@/components/rewards/RewardsUI';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { colors, fonts } from '@/theme';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

export default function DeviceUnacceptedScreen() {
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
    <CitizenPage
      title="Qué no recibimos"
      back={pointId ? { pathname: '/point/[id]', params: { id: pointId } } : '/home'}
    >
      <Text style={styles.subtitle}>{point?.name ?? 'Política de recepción por punto'}</Text>
      {point && (
        <SearchBar
          value={search}
          onChangeText={setSearch}
          label="Buscar en el listado"
          placeholder="Buscar en el listado"
        />
      )}
      {!point ? (
        <>
          <InfoNote>
            La lista depende del punto verde. Abrí el detalle de un punto para consultar su
            política.
          </InfoNote>
          <ActionButton title="Buscar puntos verdes" onPress={() => router.push('/green-points')} />
        </>
      ) : !point.intakeConfirmed ? (
        <>
          <InfoNote>
            Información pendiente de confirmar. Consultá con el punto antes de acercar un
            dispositivo.
          </InfoNote>
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
    </CitizenPage>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontFamily: fonts.semiBold, fontSize: 18, color: colors.text },
  body: { flex: 1, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
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
