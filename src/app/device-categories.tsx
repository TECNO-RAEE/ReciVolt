import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SearchBar } from '@/components/discovery/SearchBar';
import { CitizenPage, InfoNote, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  getCategoryVisual,
  getDeviceCategoryGroupKey,
  type DeviceCategory,
} from '@/models/DeviceCategory';
import { getDeviceCategories } from '@/services/device-category.service';
import { colors, fonts } from '@/theme';
import { useDiscovery } from '@/providers/DiscoveryProvider';

const groupDefinitions = [
  { key: 'informatica', title: 'Informática y comunicación', icon: 'laptop-outline' as const },
  { key: 'electrodomesticos', title: 'Electrodomésticos', icon: 'home-outline' as const },
  { key: 'insumos', title: 'Insumos eléctricos', icon: 'flash-outline' as const },
  { key: 'herramientas', title: 'Herramientas', icon: 'hammer-outline' as const },
  { key: 'juguetes', title: 'Juguetes y equipos', icon: 'game-controller-outline' as const },
  { key: 'otros', title: 'Otros dispositivos', icon: 'hardware-chip-outline' as const },
  {
    key: 'especiales',
    title: 'Residuos especiales',
    icon: 'alert-circle-outline' as const,
  },
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

export default function DeviceCategoriesScreen() {
  const { pointId } = useLocalSearchParams<{ pointId?: string }>();
  const { points } = useDiscovery();
  const point = points.find((item) => item.id === pointId);
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    void getDeviceCategories()
      .then((items) => {
        if (!cancelled) setCategories(items);
      })
      .catch(() => {
        if (!cancelled) setError('No pudimos cargar las categorías. Intentá nuevamente.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [revision]);
  const rows = useMemo(() => {
    const query = normalize(search);
    return groupDefinitions
      .map((group) => ({
        ...group,
        categories: categories.filter((category) => {
          const mode = point?.intakePolicies.find(
            (policy) => policy.categoryId === category.id
          )?.mode;
          return (
            getDeviceCategoryGroupKey(category) === group.key &&
            (!point || mode === 'onsite' || mode === 'pickup')
          );
        }),
      }))
      .filter(
        (group) =>
          !query ||
          normalize(group.title).includes(query) ||
          group.categories.some((category) => normalize(category.name).includes(query)) ||
          (!point &&
            group.key === 'especiales' &&
            ['pilas', 'baterias', 'tubos', 'especiales', 'no recibidos'].some((term) =>
              term.includes(query)
            ))
      )
      .filter((group) => !point || group.categories.length > 0);
  }, [categories, point, search]);
  return (
    <CitizenPage
      title="Qué recibimos"
      back={pointId ? { pathname: '/point/[id]', params: { id: pointId } } : '/home'}
    >
      <Text style={styles.description}>
        {point
          ? `Dispositivos que recibe ${point.name}.`
          : 'Explorá los tipos de dispositivos. Lo que recibe cada punto verde puede variar.'}
      </Text>
      {point && !point.intakeConfirmed && (
        <InfoNote>La política de este punto todavía está pendiente de confirmar.</InfoNote>
      )}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        label="Buscar en el listado"
        placeholder="Buscar en el listado"
      />
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <View style={styles.error}>
          <Text style={styles.description}>{error}</Text>
          <ActionButton
            title="Reintentar"
            onPress={() => {
              setLoading(true);
              setError(null);
              setRevision((value) => value + 1);
            }}
          />
        </View>
      ) : categories.length === 0 ? (
        <Text style={styles.description}>Todavía no hay categorías disponibles.</Text>
      ) : rows.length === 0 ? (
        <Text style={styles.description}>
          {point &&
          !point.intakePolicies.some(
            (policy) => policy.mode === 'onsite' || policy.mode === 'pickup'
          )
            ? 'Este punto todavía no cargó una lista de dispositivos recibidos.'
            : 'No encontramos dispositivos con esa búsqueda.'}
        </Text>
      ) : (
        rows.map((group) => {
          const open = search.length > 0 || openGroups.has(group.key);
          return (
            <View key={group.key} style={styles.group}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() =>
                  setOpenGroups((current) => {
                    const next = new Set(current);
                    if (next.has(group.key)) {
                      next.delete(group.key);
                    } else {
                      next.add(group.key);
                    }
                    return next;
                  })
                }
                style={styles.groupHeader}
              >
                <View style={styles.groupIcon}>
                  <Ionicons name={group.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Ionicons
                  name={open ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
              {open && (
                <View style={styles.children}>
                  {group.categories
                    .filter(
                      (category) =>
                        !search ||
                        normalize(category.name).includes(normalize(search)) ||
                        normalize(group.title).includes(normalize(search))
                    )
                    .map((category) =>
                      point ? (
                        <View key={category.id} style={styles.categoryRow}>
                          <MaterialCommunityIcons
                            name={getCategoryVisual(category).icon}
                            size={22}
                            color={colors.brandDark}
                          />
                          <Text style={styles.categoryName}>{category.name}</Text>
                          <Text style={styles.categoryMode}>
                            {point.intakePolicies.find(
                              (policy) => policy.categoryId === category.id
                            )?.mode === 'pickup'
                              ? 'Coordinar retiro'
                              : 'En el lugar'}
                          </Text>
                        </View>
                      ) : (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Buscar puntos verdes que reciben ${category.name}`}
                          key={category.id}
                          onPress={() =>
                            router.push({
                              pathname: '/green-points',
                              params: { category: category.id },
                            })
                          }
                          style={styles.categoryRow}
                        >
                          <MaterialCommunityIcons
                            name={getCategoryVisual(category).icon}
                            size={22}
                            color={colors.brandDark}
                          />
                          <Text style={styles.categoryName}>{category.name}</Text>
                          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </Pressable>
                      )
                    )}
                  {!point && group.key === 'especiales' && (
                    <View style={styles.specialNote}>
                      <InfoNote>
                        Pilas, baterías y otros residuos especiales requieren un canal habilitado y
                        no todos los puntos los reciben.
                      </InfoNote>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Ver qué no reciben los puntos verdes"
                        onPress={() => router.push('/device-unaccepted')}
                        style={styles.specialLink}
                      >
                        <Text style={s.link}>Consultar qué no reciben los puntos</Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
                      </Pressable>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
      {pointId ? (
        <ActionButton
          title="Volver al punto"
          secondary
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace({ pathname: '/point/[id]', params: { id: pointId } })
          }
        />
      ) : (
        <ActionButton title="Volver al inicio" secondary onPress={() => router.replace('/home')} />
      )}
    </CitizenPage>
  );
}

const styles = StyleSheet.create({
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text },
  error: { gap: 12 },
  group: {
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupHeader: {
    minHeight: 64,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitle: { flex: 1, color: colors.text, fontFamily: fonts.semiBold, fontSize: 16 },
  children: { borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  categoryRow: {
    minHeight: 52,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  categoryName: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  categoryMode: { color: colors.primaryDark, fontFamily: fonts.semiBold, fontSize: 13 },
  specialNote: { paddingVertical: 12, gap: 8 },
  specialLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
