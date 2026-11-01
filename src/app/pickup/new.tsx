import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ActionButton } from '@/components/ui/ActionButton';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useScrollReset } from '@/hooks/useScrollReset';
import { getCategoryVisual } from '@/models/DeviceCategory';
import { isExamplePointId, type GreenPoint } from '@/models/GreenPoint';
import { pickupQuantity } from '@/models/Pickup';
import { useAuth } from '@/providers/AuthProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { getDeliveryRates } from '@/services/delivery.service';
import {
  getPickupEligiblePoints,
  pickPickupPhoto,
  pickupCommand,
  removePickupPhoto,
} from '@/services/pickup.service';
import { colors, fonts } from '@/theme';

interface PickupDraftItem {
  id: string;
  categoryId: string;
  quantity: number;
}

export default function NewPickupScreen() {
  const { session } = useAuth();
  const { pointId: initialPoint } = useLocalSearchParams<{ pointId?: string }>();
  const [pointId, setPointId] = useState(initialPoint ?? '');
  const { points, loading, error, refresh } = useDiscovery();
  const [search, setSearch] = useState('');
  const scroll = useScrollReset();

  const [photo, setPhoto] = useState<{ path: string; uri: string } | null>(null);
  const submittedRef = useRef(false);
  const dispatchedRequestRef = useRef(false);
  const photoRef = useRef(photo);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    return () => {
      if (!submittedRef.current && !dispatchedRequestRef.current && photoRef.current?.path) {
        void removePickupPhoto(photoRef.current.path).catch(() => {});
      }
    };
  }, []);

  const handleRequestDispatched = useCallback(() => {
    dispatchedRequestRef.current = true;
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    submittedRef.current = true;
  }, []);

  const eligiblePoints = useMemo(() => getPickupEligiblePoints(points), [points]);
  const point = eligiblePoints.find((p) => p.id === pointId);

  if (!session) {
    return <AccountRequired title="Solicitar retiro" />;
  }

  if (isExamplePointId(pointId) || point?.demo) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Solicitar retiro" back="/green-points" />
        <ScrollView ref={scroll} contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="information" size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.cardTitle}>Punto de ejemplo</Text>
            <Text style={styles.cardSubtitle}>
              Este punto es de ejemplo y no ofrece retiros a domicilio reales. Elegí una organización habilitada.
            </Text>
            <ActionButton
              title="Elegir otro punto"
              secondary
              onPress={() => setPointId('')}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!point) {
    const filteredPoints = eligiblePoints.filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      );
    });

    return (
      <View style={styles.screen}>
        <ScreenHeader title="Solicitar retiro" back="/green-points" />
        <ScrollView ref={scroll} contentContainerStyle={styles.container}>
          <Text style={styles.sectionHeader}>Elegí la organización receptora</Text>
          <Text style={styles.helperText}>
            Solo las entidades con logística propia pueden retirar residuos a domicilio.
          </Text>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o localidad…"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Borrar búsqueda"
                style={styles.clearSearchBtn}
                onPress={() => setSearch('')}
              >
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Cargando organizaciones habilitadas…</Text>
          ) : error ? (
            <View style={styles.card}>
              <Text style={styles.errorText}>{error}</Text>
              <ActionButton title="Reintentar" secondary onPress={() => void refresh()} />
            </View>
          ) : (
            <>
              {filteredPoints.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Solicitar retiro a ${p.name}`}
                  style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                  onPress={() => setPointId(p.id)}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.iconCircle}>
                      <Ionicons name="car-outline" size={22} color={colors.primaryDark} />
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text style={styles.cardTitle}>{p.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {p.companyName} · {p.address}
                      </Text>
                      <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Retiro a domicilio habilitado</Text>
                        </View>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                  </View>
                </Pressable>
              ))}

              {filteredPoints.length === 0 && (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>
                    {eligiblePoints.length === 0
                      ? 'No hay organizaciones que ofrezcan retiros a domicilio en este momento.'
                      : 'No encontramos organizaciones con ese nombre.'}
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <PickupForm
      key={point.id}
      point={point}
      userId={session.user.id}
      eligiblePoints={eligiblePoints}
      onChangePoint={(newPointId) => setPointId(newPointId)}
      photo={photo}
      onPhotoChange={setPhoto}
      onRequestDispatched={handleRequestDispatched}
      onSubmitSuccess={handleSubmitSuccess}
    />
  );
}

function PickupForm({
  point,
  userId,
  eligiblePoints,
  onChangePoint,
  photo,
  onPhotoChange,
  onRequestDispatched,
  onSubmitSuccess,
}: Readonly<{
  point: GreenPoint;
  userId: string;
  eligiblePoints: GreenPoint[];
  onChangePoint: (pointId: string) => void;
  photo: { path: string; uri: string } | null;
  onPhotoChange: (newPhoto: { path: string; uri: string } | null) => void;
  onRequestDispatched: () => void;
  onSubmitSuccess: () => void;
}>) {
  const scroll = useScrollReset();
  const loader = useCallback(() => getDeliveryRates(point.companyId), [point.companyId]);
  const { data: rates } = usePortalData(loader);

  const [items, setItems] = useState<PickupDraftItem[]>(() => {
    if (point.categories.length > 0) {
      return [{ id: 'item-1', categoryId: point.categories[0].id, quantity: 1 }];
    }
    return [];
  });

  const [street, setStreet] = useState('');
  const [locality, setLocality] = useState('Pilar');
  const [reference, setReference] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [pointModalVisible, setPointModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const action = usePortalAction();
  const request = useRef<{ id: string; signature: string } | null>(null);

  const availableCategories = useMemo(() => {
    return point.categories.length > 0 ? point.categories : [];
  }, [point.categories]);

  const handleAddItem = () => {
    const used = new Set(items.map((it) => it.categoryId));
    const nextCat = availableCategories.find((c) => !used.has(c.id)) ?? availableCategories[0];
    if (!nextCat) return;

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        categoryId: nextCat.id,
        quantity: 1,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, quantity: pickupQuantity(String(qty)) } : it))
    );
  };

  const handleChangeCategoryForItem = (id: string, newCatId: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, categoryId: newCatId } : it))
    );
    setEditingItemId(null);
  };

  const handleChangePoint = (newPointId: string) => {
    setPointModalVisible(false);
    onChangePoint(newPointId);
  };

  const handlePickPhoto = () => {
    void action.run(async () => {
      const chosen = await pickPickupPhoto(userId);
      if (chosen) {
        if (photo?.path) {
          try {
            await removePickupPhoto(photo.path);
          } catch {
            // ignore
          }
        }
        onPhotoChange(chosen);
      }
    }, '');
  };

  const handleRemovePhoto = () => {
    if (!photo) return;
    void action.run(async () => {
      await removePickupPhoto(photo.path);
      onPhotoChange(null);
    }, 'Foto retirada.');
  };

  const handleSubmit = () => {
    void action.run(async () => {
      if (items.length === 0) {
        throw new Error('Seleccioná al menos un material a retirar.');
      }
      if (!street.trim()) {
        throw new Error('Ingresá la calle y número del domicilio de retiro.');
      }
      if (!locality.trim()) {
        throw new Error('Ingresá la localidad.');
      }

      const payload = {
        pointId: point.id,
        addressStreet: street.trim(),
        addressLocality: locality.trim(),
        addressReference: reference.trim(),
        citizenPhone: phone.trim(),
        notes: notes.trim(),
        photoPath: photo?.path ?? null,
        items: items.map((it) => ({
          categoryId: it.categoryId,
          quantity: pickupQuantity(String(it.quantity)),
        })),
      };

      const signature = JSON.stringify(payload);
      if (!request.current || request.current.signature !== signature) {
        request.current = { id: Crypto.randomUUID(), signature };
      }

      onRequestDispatched();
      const pickup = await pickupCommand('create', {
        ...payload,
        requestId: request.current.id,
      });
      onSubmitSuccess();
      router.replace({ pathname: '/pickup/[id]', params: { id: pickup.id } });
    }, 'Solicitud enviada.');
  };

  const editingItem = items.find((it) => it.id === editingItemId);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Solicitar retiro" back="/green-points" />
      <ScrollView ref={scroll} contentContainerStyle={styles.container}>
        {action.error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorBannerText}>{action.error}</Text>
          </View>
        )}

        {/* 1. Organización receptora */}
        <Text style={styles.sectionHeader}>Organización receptora</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cambiar organización"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          onPress={() => setPointModalVisible(true)}
        >
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="business" size={22} color={colors.primaryDark} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardTitle}>{point.name}</Text>
              <Text style={styles.cardSubtitle}>
                {point.companyName} · {point.address}
              </Text>
            </View>
            <View style={styles.changeBtn}>
              <Text style={styles.changeBtnText}>Cambiar</Text>
            </View>
          </View>
        </Pressable>

        {/* 2. Residuos a retirar */}
        <Text style={styles.sectionHeader}>Material a retirar</Text>
        {items.map((it) => {
          const cat = availableCategories.find((c) => c.id === it.categoryId);
          const visual = cat ? getCategoryVisual(cat) : { icon: 'devices' as const };
          const rate = rates?.points?.[it.categoryId] ?? 0;

          return (
            <View key={it.id} style={styles.card}>
              <View style={styles.itemHeaderRow}>
                <Pressable
                  style={styles.itemCategorySelector}
                  accessibilityRole="button"
                  accessibilityLabel={`Categoría: ${cat?.name ?? 'Elegir'}`}
                  onPress={() => setEditingItemId(it.id)}
                >
                  <View style={styles.iconCircleSmall}>
                    <MaterialCommunityIcons name={visual.icon} size={20} color={colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemCategoryName}>{cat?.name ?? 'Elegir categoría'}</Text>
                    {rate > 0 ? (
                      <Text style={styles.itemRateText}>+{rate} pts por unidad estimada</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                </Pressable>

                {items.length > 1 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Eliminar este residuo"
                    style={styles.deleteItemBtn}
                    onPress={() => handleRemoveItem(it.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>

              <View style={styles.stepperContainer}>
                <Text style={styles.stepperLabel}>Cantidad:</Text>
                <NumericStepper
                  value={it.quantity}
                  min={1}
                  max={999}
                  onChange={(q) => handleUpdateQuantity(it.id, q)}
                  accessibilityLabel={`Cantidad de ${cat?.name ?? 'dispositivos'}`}
                />
              </View>
            </View>
          );
        })}

        {availableCategories.length > items.length && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar otro residuo"
            style={({ pressed }) => [styles.addMoreBtn, pressed && styles.pressed]}
            onPress={handleAddItem}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.addMoreText}>Agregar otro residuo</Text>
          </Pressable>
        )}

        {/* 3. Domicilio de retiro */}
        <Text style={styles.sectionHeader}>Dirección de retiro</Text>
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Calle y altura *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Av. Tratado del Pilar 1234"
              placeholderTextColor={colors.textSecondary}
              value={street}
              onChangeText={setStreet}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Localidad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Pilar, Del Viso, Derqui"
              placeholderTextColor={colors.textSecondary}
              value={locality}
              onChangeText={setLocality}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Referencias de domicilio</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Portón blanco, timbre 2B, entre calles X e Y"
              placeholderTextColor={colors.textSecondary}
              value={reference}
              onChangeText={setReference}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Teléfono de contacto</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 11 2345-6789"
              placeholderTextColor={colors.textSecondary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </View>

        {/* 4. Carga de foto opcional */}
        <Text style={styles.sectionHeader}>Foto del material (opcional)</Text>
        <View style={styles.card}>
          {photo ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} resizeMode="cover" />
              <View style={styles.photoDetailsCol}>
                <Text style={styles.photoSuccessText}>Foto adjunta con éxito</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar foto"
                  style={styles.photoRemoveBtn}
                  onPress={handleRemovePhoto}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.photoRemoveText}>Eliminar foto</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Subir foto del residuo"
              style={({ pressed }) => [styles.photoPlaceholder, pressed && styles.pressed]}
              onPress={handlePickPhoto}
            >
              <Ionicons name="camera-outline" size={28} color={colors.primary} />
              <Text style={styles.photoPlaceholderTitle}>Subir foto (opcional)</Text>
              <Text style={styles.photoPlaceholderHint}>Ayuda a dimensionar el vehículo necesario</Text>
            </Pressable>
          )}
        </View>

        {/* 5. Notas opcionales */}
        <Text style={styles.sectionHeader}>Notas adicionales (opcional)</Text>
        <View style={styles.card}>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Ej. Es un equipo pesado en primer piso por escalera…"
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={200}
            value={notes}
            onChangeText={setNotes}
          />
          <Text style={styles.counterText}>{notes.length}/200</Text>
        </View>

        {/* 6. Aviso de coordinación */}
        <View style={styles.noticeBox}>
          <Ionicons name="information-circle" size={22} color={colors.primary} />
          <Text style={styles.noticeText}>
            La organización se comunicará con vos para acordar la fecha y franja horaria de retiro.
            Los puntos se acreditarán tras la verificación física.
          </Text>
        </View>

        {/* 7. Botón de envío */}
        <ActionButton
          title="Enviar solicitud"
          loading={action.busy}
          disabled={action.busy || items.length === 0 || !street.trim() || !locality.trim()}
          onPress={handleSubmit}
        />
      </ScrollView>

      {/* Modal: Cambiar organización */}
      <Modal
        visible={pointModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPointModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Organizaciones habilitadas</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
                onPress={() => setPointModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {eligiblePoints.map((p) => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [
                    styles.modalOption,
                    p.id === point.id && styles.modalOptionSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleChangePoint(p.id)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionTitle}>{p.name}</Text>
                    <Text style={styles.modalOptionSubtitle}>{p.address}</Text>
                  </View>
                  {p.id === point.id && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal: Cambiar categoría del ítem */}
      <Modal
        visible={editingItemId !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingItemId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar categoría</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal"
                onPress={() => setEditingItemId(null)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              {availableCategories.map((cat) => {
                const visual = getCategoryVisual(cat);
                const isSelected = editingItem?.categoryId === cat.id;

                return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => editingItemId && handleChangeCategoryForItem(editingItemId, cat.id)}
                  >
                    <MaterialCommunityIcons
                      name={visual.icon}
                      size={22}
                      color={colors.primaryDark}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={styles.modalOptionTitle}>{cat.name}</Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    marginTop: 8,
  },
  helperText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
  },
  clearSearchBtn: {
    padding: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  cardSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  badge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemCategorySelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  itemCategoryName: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
  },
  itemRateText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primaryDark,
  },
  deleteItemBtn: {
    padding: 8,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  stepperLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    gap: 8,
    backgroundColor: colors.surface,
  },
  addMoreText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  multilineInput: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  counterText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: -6,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoPreview: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  photoDetailsCol: {
    flex: 1,
    gap: 6,
  },
  photoSuccessText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  photoRemoveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  photoRemoveText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.danger,
  },
  photoPlaceholder: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.background,
  },
  photoPlaceholderTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
  },
  photoPlaceholderHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBackground,
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.danger,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  modalScroll: {
    maxHeight: 380,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionSelected: {
    backgroundColor: colors.surfaceSoft,
  },
  modalOptionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
  },
  modalOptionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
