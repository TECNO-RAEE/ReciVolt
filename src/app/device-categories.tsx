import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ActionButton } from '@/components/ui/ActionButton';
import type { DeviceCategory } from '@/models/DeviceCategory';
import { getCategoryVisual } from '@/models/DeviceCategory';
import { getDeviceCategoryGroupKey } from '@/models/DeviceCategory';
import { getDeviceCategories } from '@/services/device-category.service';
import { colors, fonts } from '@/theme';
import { useScrollReset } from '@/hooks/useScrollReset';
import { useDiscovery } from '@/providers/DiscoveryProvider';

const groupDefinitions = [
  { key: 'informatica', title: 'Informática y comunicación', icon: 'laptop-outline' as const },
  { key: 'electrodomesticos', title: 'Electrodomésticos', icon: 'home-outline' as const },
  { key: 'insumos', title: 'Insumos eléctricos', icon: 'flash-outline' as const },
  { key: 'herramientas', title: 'Herramientas', icon: 'hammer-outline' as const },
  { key: 'juguetes', title: 'Juguetes y equipos', icon: 'game-controller-outline' as const },
  { key: 'otros', title: 'Otros dispositivos', icon: 'hardware-chip-outline' as const },
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();

export default function DeviceCategoriesScreen() {
  const scroll = useScrollReset();
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
    const definitions = point
      ? [
          ...groupDefinitions,
          {
            key: 'especiales',
            title: 'Residuos especiales',
            icon: 'alert-circle-outline' as const,
          },
        ]
      : groupDefinitions;
    return definitions
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
          group.categories.some((category) => normalize(category.name).includes(query))
      )
      .filter((group) => !point || group.categories.length > 0);
  }, [categories, point, search]);
  return (
    <View style={styles.container}>
      <ScreenHeader title="Qué recibimos" back={pointId ? `/point/${pointId}` : '/profile'} />
      <ScrollView ref={scroll} contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          {point
            ? `Dispositivos que recibe ${point.name}.`
            : 'Explorá los tipos de dispositivos. Lo que recibe cada punto verde puede variar.'}
        </Text>
        {point && !point.intakeConfirmed && (
          <Text style={styles.pending}>
            La política de este punto todavía está pendiente de confirmar.
          </Text>
        )}
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
                      next.has(group.key) ? next.delete(group.key) : next.add(group.key);
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
                      .map((category) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={
                            point
                              ? `${category.name}: ${point.intakePolicies.find((policy) => policy.categoryId === category.id)?.mode === 'pickup' ? 'requiere coordinar retiro' : 'se recibe en el lugar'}`
                              : `Buscar puntos verdes que reciben ${category.name}`
                          }
                          key={category.id}
                          onPress={() =>
                            point
                              ? undefined
                              : router.push({
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
                          {point && (
                            <Text style={styles.categoryMode}>
                              {point.intakePolicies.find(
                                (policy) => policy.categoryId === category.id
                              )?.mode === 'pickup'
                                ? 'Coordinar retiro'
                                : 'En el lugar'}
                            </Text>
                          )}
                          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                        </Pressable>
                      ))}
                  </View>
                )}
              </View>
            );
          })
        )}
        <ActionButton title="Volver al inicio" secondary onPress={() => router.replace('/home')} />
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
  description: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, color: colors.text },
  pending: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
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
});
