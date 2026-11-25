import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountRequired } from '@/components/auth/AccountRequired';
import { ActionButton } from '@/components/ui/ActionButton';
import { AnimatedSheetModal } from '@/components/ui/AnimatedSheetModal';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { useScrollReset } from '@/hooks/useScrollReset';
import { getCategoryVisual } from '@/models/DeviceCategory';
import { isExamplePointId, type GreenPoint } from '@/models/GreenPoint';
import { pickupQuantity } from '@/models/Pickup';
import {
  addPickupDraftItem,
  changePickupDraftItemCategory,
  createEmptyPickupDraftFields,
  hasPickupDraftErrors,
  reconcilePickupDraftItems,
  remainingPickupCategories,
  selectableCategoriesForPickupItem,
  validatePickupDraft,
  type PickupDraftFields,
  type PickupDraftItem,
} from '@/models/PickupDraft';
import { useAuth } from '@/providers/AuthProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import { getDeliveryRates } from '@/services/delivery.service';
import {
  getPickupEligiblePoints,
  pickPickupPhoto,
  pickupCommand,
  removePickupPhoto,
} from '@/services/pickup.service';
import {
  fonts,
  motion,
  useColors,
  useThemedStyles,
  webInputReset,
  type ThemeColors,
} from '@/theme';

function createDraftItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function NewPickupScreen() {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { pointId: initialPoint } = useLocalSearchParams<{ pointId?: string }>();
  const [pointId, setPointId] = useState(initialPoint ?? '');
  const { points, loading, error, refresh } = useDiscovery();
  const [search, setSearch] = useState('');
  const scroll = useScrollReset();

  const [fields, setFields] = useState<PickupDraftFields>(createEmptyPickupDraftFields);
  const [rawItems, setRawItems] = useState<PickupDraftItem[]>([]);
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

  const items = useMemo(
    () =>
      point
        ? reconcilePickupDraftItems(rawItems, point.categories, () => `item-${point.id}`)
        : rawItems,
    [rawItems, point]
  );

  const handleSelectPoint = useCallback(
    (newPointId: string) => {
      const nextPoint = eligiblePoints.find((p) => p.id === newPointId);
      setPointId(newPointId);
      if (nextPoint) {
        setRawItems((current) =>
          reconcilePickupDraftItems(current, nextPoint.categories, () => `item-${nextPoint.id}`)
        );
      }
    },
    [eligiblePoints]
  );

  const backRoute = initialPoint
    ? ({ pathname: '/point/[id]', params: { id: initialPoint } } as const)
    : ('/my-raee' as const);

  if (!session) {
    return <AccountRequired title="Solicitar retiro" back={backRoute} />;
  }

  if (isExamplePointId(pointId) || point?.demo) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Solicitar retiro" back="/green-points" />
        <ScrollView
          ref={scroll}
          contentContainerStyle={[
            styles.container,
            insets.bottom > 0 && { paddingBottom: 32 + insets.bottom },
          ]}
        >
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="information" size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.cardTitle}>Punto de ejemplo</Text>
            <Text style={styles.cardSubtitle}>
              Este punto es de ejemplo y no ofrece retiros a domicilio reales. Elegí una
              organización habilitada.
            </Text>
            <ActionButton title="Elegir otro punto" secondary onPress={() => setPointId('')} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!point) {
    const query = search.trim().toLocaleLowerCase('es');
    const filteredPoints = eligiblePoints.filter((p) => {
      if (!query) return true;
      return `${p.name} ${p.companyName} ${p.address}`.toLocaleLowerCase('es').includes(query);
    });

    return (
      <View style={styles.screen}>
        <ScreenHeader title="Solicitar retiro" back={backRoute} />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scroll}
            contentContainerStyle={[
              styles.container,
              insets.bottom > 0 && { paddingBottom: 32 + insets.bottom },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {!loading && !error && Boolean(pointId) && (
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={22} color={colors.primaryDark} />
                <Text style={styles.noticeText}>
                  El punto seleccionado dejó de estar disponible para retiros. Elegí otro punto para
                  continuar.
                </Text>
              </View>
            )}

            <Text style={styles.sectionHeader}>Elegí la organización receptora</Text>
            <Text style={styles.helperText}>
              Solo las entidades con logística propia pueden retirar residuos a domicilio.
            </Text>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                accessibilityLabel="Buscar organización por nombre o localidad"
                placeholder="Buscar por nombre o localidad…"
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
                returnKeyType="search"
              />
              {search.length > 0 && (
                <SpringPressable
                  accessibilityRole="button"
                  accessibilityLabel="Borrar búsqueda"
                  pressScale={motion.scale.icon}
                  style={styles.clearSearchBtn}
                  onPress={() => setSearch('')}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </SpringPressable>
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
                  <SpringPressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Solicitar retiro a ${p.name}`}
                    pressScale={motion.scale.card}
                    style={[styles.card, styles.interactiveCard]}
                    onPress={() => handleSelectPoint(p.id)}
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
                  </SpringPressable>
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
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <PickupForm
      key={point.id}
      point={point}
      userId={session.user.id}
      backRoute={backRoute}
      eligiblePoints={eligiblePoints}
      items={items}
      onItemsChange={setRawItems}
      fields={fields}
      onFieldsChange={setFields}
      onChangePoint={handleSelectPoint}
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
  backRoute,
  eligiblePoints,
  items,
  onItemsChange,
  fields,
  onFieldsChange,
  onChangePoint,
  photo,
  onPhotoChange,
  onRequestDispatched,
  onSubmitSuccess,
}: Readonly<{
  point: GreenPoint;
  userId: string;
  backRoute: '/my-raee' | { pathname: '/point/[id]'; params: { id: string } };
  eligiblePoints: GreenPoint[];
  items: PickupDraftItem[];
  onItemsChange: (
    next: PickupDraftItem[] | ((prev: PickupDraftItem[]) => PickupDraftItem[])
  ) => void;
  fields: PickupDraftFields;
  onFieldsChange: (
    next: PickupDraftFields | ((prev: PickupDraftFields) => PickupDraftFields)
  ) => void;
  onChangePoint: (pointId: string) => void;
  photo: { path: string; uri: string } | null;
  onPhotoChange: (newPhoto: { path: string; uri: string } | null) => void;
  onRequestDispatched: () => void;
  onSubmitSuccess: () => void;
}>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const scroll = useScrollReset();
  const localityInputRef = useRef<TextInputInstance>(null);
  const referenceInputRef = useRef<TextInputInstance>(null);
  const phoneInputRef = useRef<TextInputInstance>(null);
  const notesInputRef = useRef<TextInputInstance>(null);
  const loader = useCallback(() => getDeliveryRates(point.companyId), [point.companyId]);
  const { data: rates } = usePortalData(loader);

  const [pointModalVisible, setPointModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [lastActionSource, setLastActionSource] = useState<'photo' | 'submit' | null>(null);

  const action = usePortalAction();
  const request = useRef<{ id: string; signature: string } | null>(null);

  const availableCategories = point.categories;
  const hasCategories = availableCategories.length > 0;
  const canChangeCategory = availableCategories.length > 1;

  const remainingCategories = useMemo(
    () => remainingPickupCategories(availableCategories, items),
    [availableCategories, items]
  );

  const selectableCategoriesForModal = useMemo(
    () => selectableCategoriesForPickupItem(availableCategories, items, editingItemId),
    [availableCategories, items, editingItemId]
  );

  const validationErrors = useMemo(
    () =>
      showValidation
        ? validatePickupDraft({
            items,
            street: fields.street,
            locality: fields.locality,
          })
        : {},
    [showValidation, items, fields.street, fields.locality]
  );

  const updateField = <K extends keyof PickupDraftFields>(key: K, value: PickupDraftFields[K]) => {
    onFieldsChange((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddItem = () => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, availableCategories, () => `item-${point.id}`);
      return addPickupDraftItem(base, availableCategories, createDraftItemId());
    });
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, availableCategories, () => `item-${point.id}`);
      return base.filter((it) => it.id !== id);
    });
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, availableCategories, () => `item-${point.id}`);
      return base.map((it) =>
        it.id === id ? { ...it, quantity: pickupQuantity(String(qty)) } : it
      );
    });
  };

  const handleChangeCategoryForItem = (id: string, newCatId: string) => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, availableCategories, () => `item-${point.id}`);
      return changePickupDraftItemCategory(base, id, newCatId, availableCategories);
    });
    setEditingItemId(null);
  };

  const handleChangePoint = (newPointId: string) => {
    setPointModalVisible(false);
    onChangePoint(newPointId);
  };

  const handlePickPhoto = () => {
    setLastActionSource('photo');
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
    setLastActionSource('photo');
    void action.run(async () => {
      await removePickupPhoto(photo.path);
      onPhotoChange(null);
    }, 'Foto retirada.');
  };

  const handleSubmit = () => {
    const errors = validatePickupDraft({
      items,
      street: fields.street,
      locality: fields.locality,
    });
    if (hasPickupDraftErrors(errors)) {
      setShowValidation(true);
      return;
    }

    setShowValidation(false);
    setLastActionSource('submit');
    void action.run(async () => {
      const payload = {
        pointId: point.id,
        addressStreet: fields.street.trim(),
        addressLocality: fields.locality.trim(),
        addressReference: fields.reference.trim(),
        citizenPhone: fields.phone.trim(),
        notes: fields.notes.trim(),
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
  const submitBannerError =
    validationErrors.summary ?? (lastActionSource === 'submit' ? action.error : null);

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Solicitar retiro" back={backRoute} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scroll}
          contentContainerStyle={[
            styles.container,
            insets.bottom > 0 && { paddingBottom: 32 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Organización receptora */}
          <Text style={styles.sectionHeader}>Organización receptora</Text>
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Cambiar organización"
            pressScale={motion.scale.card}
            style={[styles.card, styles.interactiveCard]}
            disabled={action.busy}
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
          </SpringPressable>

          {!hasCategories ? (
            <View style={styles.emptyCategoriesSection}>
              <Text style={styles.sectionHeader}>Material a retirar</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="information-circle-outline"
                      size={24}
                      color={colors.primaryDark}
                    />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.cardTitle}>Este punto no tiene materiales habilitados</Text>
                    <Text style={styles.cardSubtitle}>
                      Todavía no tiene categorías cargadas para coordinar retiros a domicilio. Elegí
                      otro punto para continuar.
                    </Text>
                  </View>
                </View>
                <ActionButton title="Elegir otro punto" onPress={() => onChangePoint('')} />
              </View>
            </View>
          ) : (
            <>
              {/* 2. Residuos a retirar */}
              <Text style={styles.sectionHeader}>Material a retirar</Text>
              {items.map((it) => {
                const cat = availableCategories.find((c) => c.id === it.categoryId);
                const visual = cat ? getCategoryVisual(cat) : { icon: 'devices' as const };
                const rate = rates?.points?.[it.categoryId] ?? 0;

                return (
                  <View key={it.id} style={styles.card}>
                    <View style={styles.itemHeaderRow}>
                      <SpringPressable
                        pressScale={motion.scale.row}
                        style={styles.itemCategorySelector}
                        accessibilityRole={canChangeCategory ? 'button' : 'none'}
                        accessibilityLabel={
                          canChangeCategory
                            ? `Categoría: ${cat?.name ?? 'Elegir'}. Tocá para cambiar.`
                            : `Categoría: ${cat?.name ?? 'Elegir'}. Única categoría aceptada.`
                        }
                        accessibilityState={{ disabled: !canChangeCategory || action.busy }}
                        disabled={!canChangeCategory || action.busy}
                        onPress={() => setEditingItemId(it.id)}
                      >
                        <View style={styles.iconCircleSmall}>
                          <MaterialCommunityIcons
                            name={visual.icon}
                            size={20}
                            color={colors.primaryDark}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.itemCategoryName}>
                            {cat?.name ?? 'Elegir categoría'}
                          </Text>
                          {!canChangeCategory ? (
                            <Text style={styles.onlyCategoryNotice}>
                              Única categoría aceptada en este punto
                            </Text>
                          ) : rate > 0 ? (
                            <Text style={styles.itemRateText}>+{rate} pts por unidad estimada</Text>
                          ) : null}
                        </View>
                        {canChangeCategory ? (
                          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                        ) : null}
                      </SpringPressable>

                      {items.length > 1 && (
                        <SpringPressable
                          accessibilityRole="button"
                          accessibilityLabel="Eliminar este material"
                          pressScale={motion.scale.icon}
                          style={styles.deleteItemBtn}
                          disabled={action.busy}
                          onPress={() => handleRemoveItem(it.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </SpringPressable>
                      )}
                    </View>

                    <View style={styles.stepperContainer}>
                      <Text style={styles.stepperLabel}>Cantidad:</Text>
                      <NumericStepper
                        value={it.quantity}
                        min={1}
                        max={999}
                        disabled={action.busy}
                        onChange={(q) => handleUpdateQuantity(it.id, q)}
                        accessibilityLabel={`Cantidad de ${cat?.name ?? 'dispositivos'}`}
                      />
                    </View>
                  </View>
                );
              })}

              {validationErrors.items && (
                <Text accessibilityRole="alert" style={styles.fieldError}>
                  {validationErrors.items}
                </Text>
              )}

              {remainingCategories.length > 0 && (
                <SpringPressable
                  accessibilityRole="button"
                  accessibilityLabel="Agregar otro material"
                  accessibilityState={{ disabled: action.busy }}
                  disabled={action.busy}
                  pressScale={motion.scale.button}
                  style={styles.addMoreBtn}
                  onPress={handleAddItem}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addMoreText}>Agregar otro material</Text>
                </SpringPressable>
              )}

              {/* 3. Domicilio de retiro */}
              <Text style={styles.sectionHeader}>Dirección de retiro</Text>
              <View style={styles.card}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Calle y altura *</Text>
                  <TextInput
                    style={[styles.input, validationErrors.street && styles.inputError]}
                    accessibilityLabel="Calle y altura"
                    placeholder="Ej. Av. Tratado del Pilar 1234"
                    placeholderTextColor={colors.textSecondary}
                    textContentType="streetAddressLine1"
                    autoComplete="street-address"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => localityInputRef.current?.focus()}
                    editable={!action.busy}
                    value={fields.street}
                    onChangeText={(value) => updateField('street', value)}
                  />
                  {validationErrors.street && (
                    <Text accessibilityRole="alert" style={styles.fieldError}>
                      {validationErrors.street}
                    </Text>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Localidad *</Text>
                  <TextInput
                    ref={localityInputRef}
                    style={[styles.input, validationErrors.locality && styles.inputError]}
                    accessibilityLabel="Localidad"
                    placeholder="Ej. Pilar"
                    placeholderTextColor={colors.textSecondary}
                    textContentType="addressCity"
                    autoComplete="postal-address-locality"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => referenceInputRef.current?.focus()}
                    editable={!action.busy}
                    value={fields.locality}
                    onChangeText={(value) => updateField('locality', value)}
                  />
                  {validationErrors.locality && (
                    <Text accessibilityRole="alert" style={styles.fieldError}>
                      {validationErrors.locality}
                    </Text>
                  )}
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Referencias de domicilio (opcional)</Text>
                  <TextInput
                    ref={referenceInputRef}
                    style={styles.input}
                    accessibilityLabel="Referencias de domicilio"
                    placeholder="Ej. Portón blanco, timbre 2B, entre calles X e Y"
                    placeholderTextColor={colors.textSecondary}
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                    editable={!action.busy}
                    value={fields.reference}
                    onChangeText={(value) => updateField('reference', value)}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Teléfono de contacto (opcional)</Text>
                  <TextInput
                    ref={phoneInputRef}
                    style={styles.input}
                    accessibilityLabel="Teléfono de contacto (opcional)"
                    placeholder="Ej. 11 2345-6789"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    autoComplete="tel"
                    returnKeyType="next"
                    submitBehavior="submit"
                    onSubmitEditing={() => notesInputRef.current?.focus()}
                    editable={!action.busy}
                    value={fields.phone}
                    onChangeText={(value) => updateField('phone', value)}
                  />
                </View>
              </View>

              {/* 4. Carga de foto opcional */}
              <Text style={styles.sectionHeader}>Foto del material (opcional)</Text>
              <View style={styles.card}>
                {lastActionSource === 'photo' && action.error && (
                  <View accessibilityRole="alert" style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={20} color={colors.danger} />
                    <Text style={styles.errorBannerText}>{action.error}</Text>
                  </View>
                )}
                {photo ? (
                  <View style={styles.photoContainer}>
                    <Image
                      source={{ uri: photo.uri }}
                      accessibilityLabel="Foto del material"
                      style={styles.photoPreview}
                      resizeMode="cover"
                    />
                    <View style={styles.photoDetailsCol}>
                      <Text style={styles.photoSuccessText}>Foto adjunta con éxito</Text>
                      <SpringPressable
                        accessibilityRole="button"
                        accessibilityLabel="Eliminar foto"
                        pressScale={motion.scale.button}
                        disabled={action.busy}
                        style={styles.photoRemoveBtn}
                        onPress={handleRemovePhoto}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.danger} />
                        <Text style={styles.photoRemoveText}>Eliminar foto</Text>
                      </SpringPressable>
                    </View>
                  </View>
                ) : (
                  <SpringPressable
                    accessibilityRole="button"
                    accessibilityLabel="Subir foto del material"
                    pressScale={motion.scale.card}
                    disabled={action.busy}
                    style={styles.photoPlaceholder}
                    onPress={handlePickPhoto}
                  >
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                    <Text style={styles.photoPlaceholderTitle}>Subir foto (opcional)</Text>
                    <Text style={styles.photoPlaceholderHint}>
                      Ayuda a dimensionar el vehículo necesario
                    </Text>
                  </SpringPressable>
                )}
              </View>

              {/* 5. Notas opcionales */}
              <Text style={styles.sectionHeader}>Notas adicionales (opcional)</Text>
              <View style={styles.card}>
                <TextInput
                  ref={notesInputRef}
                  style={[styles.input, styles.multilineInput]}
                  accessibilityLabel="Notas adicionales"
                  placeholder="Ej. Es un equipo pesado en primer piso por escalera…"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
                  returnKeyType="done"
                  editable={!action.busy}
                  value={fields.notes}
                  onChangeText={(value) => updateField('notes', value)}
                />
                <Text style={styles.counterText}>{fields.notes.length}/200</Text>
              </View>

              {/* 6. Aviso de coordinación */}
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle" size={22} color={colors.primary} />
                <Text style={styles.noticeText}>
                  La organización se comunicará con vos para acordar la fecha y franja horaria de
                  retiro. Los puntos se acreditarán tras la verificación física.
                </Text>
              </View>

              {submitBannerError && (
                <View accessibilityRole="alert" style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={20} color={colors.danger} />
                  <Text style={styles.errorBannerText}>{submitBannerError}</Text>
                </View>
              )}

              {/* 7. Botón de envío */}
              <ActionButton
                title="Enviar solicitud"
                loading={action.busy}
                disabled={action.busy}
                onPress={handleSubmit}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal: Cambiar organización */}
      <AnimatedSheetModal
        visible={pointModalVisible}
        onClose={() => setPointModalVisible(false)}
        presentation="sheet"
        containerStyle={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            Organizaciones habilitadas
          </Text>
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal"
            pressScale={motion.scale.icon}
            style={styles.modalCloseBtn}
            onPress={() => setPointModalVisible(false)}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </SpringPressable>
        </View>

        <ScrollView style={styles.modalScroll}>
          {eligiblePoints.map((p) => {
            const isSelected = p.id === point.id;
            return (
              <SpringPressable
                key={p.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                pressScale={motion.scale.row}
                style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
                onPress={() => handleChangePoint(p.id)}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.modalOptionTitle}>{p.name}</Text>
                  <Text style={styles.modalOptionSubtitle}>{p.address}</Text>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </SpringPressable>
            );
          })}
        </ScrollView>
      </AnimatedSheetModal>

      {/* Modal: Cambiar categoría del ítem (sin duplicar categorías ya elegidas) */}
      <AnimatedSheetModal
        visible={editingItemId !== null}
        onClose={() => setEditingItemId(null)}
        presentation="sheet"
        containerStyle={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={styles.modalHandle} />
        <View style={styles.modalHeader}>
          <Text accessibilityRole="header" style={styles.modalTitle}>
            Seleccionar categoría
          </Text>
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar modal"
            pressScale={motion.scale.icon}
            style={styles.modalCloseBtn}
            onPress={() => setEditingItemId(null)}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </SpringPressable>
        </View>

        <ScrollView style={styles.modalScroll}>
          {selectableCategoriesForModal.map((cat) => {
            const visual = getCategoryVisual(cat);
            const isSelected = editingItem?.categoryId === cat.id;

            return (
              <SpringPressable
                key={cat.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                pressScale={motion.scale.row}
                style={[styles.modalOption, isSelected && styles.modalOptionSelected]}
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
              </SpringPressable>
            );
          })}
        </ScrollView>
      </AnimatedSheetModal>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      padding: 20,
      paddingBottom: 32,
      gap: 14,
    },
    sectionHeader: {
      fontFamily: fonts.bold,
      fontSize: 16,
      color: colors.text,
      marginTop: 8,
    },
    emptyCategoriesSection: {
      gap: 14,
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
      ...webInputReset,
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
    },
    clearSearchBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 12,
    },
    interactiveCard: {
      minHeight: 44,
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
      minWidth: 0,
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
      minHeight: 44,
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
    onlyCategoryNotice: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
    },
    deleteItemBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
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
      minHeight: 48,
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
      ...webInputReset,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: fonts.regular,
      fontSize: 16,
      color: colors.text,
    },
    inputError: {
      borderColor: colors.danger,
    },
    fieldError: {
      fontFamily: fonts.regular,
      fontSize: 12,
      color: colors.danger,
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
      minHeight: 44,
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
      minHeight: 44,
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
      minWidth: 0,
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
      minWidth: 0,
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
    modalContent: {
      width: '100%',
      maxWidth: 960,
      alignSelf: 'center',
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      paddingTop: 10,
      paddingHorizontal: 20,
      gap: 12,
    },
    modalHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderControl,
      alignSelf: 'center',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    modalTitle: {
      flex: 1,
      minWidth: 0,
      fontFamily: fonts.bold,
      fontSize: 18,
      color: colors.text,
    },
    modalCloseBtn: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalScroll: {
      maxHeight: 380,
    },
    modalOption: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 48,
      paddingVertical: 14,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalOptionSelected: {
      backgroundColor: colors.surfaceSoft,
    },
    modalOptionTitle: {
      flexShrink: 1,
      minWidth: 0,
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
