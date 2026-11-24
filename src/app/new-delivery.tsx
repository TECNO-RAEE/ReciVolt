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
import { PortalFeedback, PortalLink } from '@/components/portal/PortalUI';
import { CitizenPage, InfoNote } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { NumericStepper } from '@/components/ui/NumericStepper';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import { deliveryQuantity } from '@/models/Delivery';
import { getCategoryVisual } from '@/models/DeviceCategory';
import { canRegisterDelivery, isExamplePointId, type GreenPoint } from '@/models/GreenPoint';
import {
  addPickupDraftItem,
  changePickupDraftItemCategory,
  reconcilePickupDraftItems,
  remainingPickupCategories,
  selectableCategoriesForPickupItem,
  type PickupDraftItem,
} from '@/models/PickupDraft';
import { useAuth } from '@/providers/AuthProvider';
import { useDiscovery } from '@/providers/DiscoveryProvider';
import {
  deliveryCommand,
  getDeliveryRates,
  pickDeliveryPhoto,
  removeDeliveryPhoto,
} from '@/services/delivery.service';
import { colors, fonts } from '@/theme';

type DeliveryDraftItem = PickupDraftItem;

function createDraftItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export default function NewDeliveryScreen() {
  const { session } = useAuth();
  const { pointId: initialPoint } = useLocalSearchParams<{ pointId?: string }>();
  const [pointId, setPointId] = useState(initialPoint ?? '');
  const { points, loading, error, refresh } = useDiscovery();
  const [search, setSearch] = useState('');

  const [rawItems, setRawItems] = useState<DeliveryDraftItem[]>([]);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ path: string; uri: string } | null>(null);
  const submittedRef = useRef(false);
  const dispatchedRequestRef = useRef(false);
  const photoRef = useRef(photo);

  useEffect(() => {
    photoRef.current = photo;
  }, [photo]);

  useEffect(() => {
    return () => {
      // If unmounted without submitting and no create request was dispatched, clean up uploaded photo.
      // If a request was dispatched to the server, do not delete to protect against data loss if
      // the delivery was persisted on the server despite client-side network error or timeout.
      if (!submittedRef.current && !dispatchedRequestRef.current && photoRef.current?.path) {
        void removeDeliveryPhoto(photoRef.current.path).catch(() => {});
      }
    };
  }, []);

  // Trade-off documentado: una vez despachado el comando de creación al servidor, marcamos la
  // foto como despachada para que el cleanup de unmount NO la elimine. Esto previene pérdida de datos
  // si el backend persistió la entrega pero la respuesta cliente se perdió por timeout o red caída.
  // Contrapartida aceptada: si el create falla de forma definitiva (ej. validación del servidor)
  // y el usuario sale de la pantalla, la foto queda huérfana en Storage para privilegiar la integridad
  // de datos sobre la recolección de basura.
  const handleRequestDispatched = useCallback(() => {
    dispatchedRequestRef.current = true;
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    submittedRef.current = true;
  }, []);

  const point = points.find((p) => p.id === pointId);
  const deliveryPoints = useMemo(() => points.filter(canRegisterDelivery), [points]);

  const items = useMemo(
    () =>
      point
        ? reconcilePickupDraftItems(rawItems, point.categories, () => `item-${point.id}`)
        : rawItems,
    [rawItems, point]
  );

  const handleSelectPoint = useCallback(
    (newPointId: string) => {
      const nextPoint = deliveryPoints.find((p) => p.id === newPointId);
      setPointId(newPointId);
      if (nextPoint) {
        setRawItems((current) =>
          reconcilePickupDraftItems(current, nextPoint.categories, () => `item-${nextPoint.id}`)
        );
      }
    },
    [deliveryPoints]
  );

  if (!session) {
    return <AccountRequired title="Nueva entrega" />;
  }

  if (isExamplePointId(pointId) || point?.demo) {
    return (
      <CitizenPage title="Nueva entrega" back="/green-points">
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="information" size={24} color={colors.primaryDark} />
          </View>
          <Text style={styles.cardTitle}>Punto verde de ejemplo</Text>
          <Text style={styles.cardSubtitle}>
            Podés explorar este punto, pero no registrar entregas reales. Elegí un punto publicado
            para entregar tus dispositivos.
          </Text>
          <ActionButton
            title="Ver puntos verdes"
            onPress={() => router.replace('/green-points')}
          />
        </View>
      </CitizenPage>
    );
  }

  // If no point selected, show point selection list
  if (!point) {
    const filteredPoints = deliveryPoints.filter((p) =>
      `${p.name} ${p.address} ${p.companyName}`
        .toLocaleLowerCase('es')
        .includes(search.toLocaleLowerCase('es'))
    );

    return (
      <CitizenPage title="Nueva entrega" back="/my-raee">
        {/* Only show warning after loading completes and point is missing */}
        {!loading && !error && Boolean(pointId) && !point && (
          <InfoNote>
            El punto seleccionado dejó de estar disponible. Elegí otro punto para continuar.
          </InfoNote>
        )}

        <Text accessibilityRole="header" style={styles.sectionHeader}>
          Elegí la organización receptora
        </Text>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
          <TextInput
            accessibilityLabel="Buscar por punto, dirección o empresa"
            style={styles.searchInput}
            placeholder="Buscar por punto, dirección o empresa"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
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
          <Text style={styles.loadingText}>Cargando puntos verdes…</Text>
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
                accessibilityLabel={`Entregar en ${p.name}`}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => handleSelectPoint(p.id)}
              >
                <View style={styles.cardRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="business" size={22} color={colors.primaryDark} />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.cardTitle}>{p.name}</Text>
                    <Text style={styles.cardSubtitle}>
                      {p.companyName} · {p.address}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </View>
              </Pressable>
            ))}

            {filteredPoints.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.emptyText}>
                  {deliveryPoints.length === 0
                    ? 'Todavía no hay puntos publicados para registrar una entrega.'
                    : 'No encontramos puntos verdes con ese nombre.'}
                </Text>
              </View>
            )}
          </>
        )}
      </CitizenPage>
    );
  }

  return (
    <DeliveryForm
      key={point.id}
      point={point}
      userId={session.user.id}
      deliveryPoints={deliveryPoints}
      items={items}
      onItemsChange={setRawItems}
      notes={notes}
      onNotesChange={setNotes}
      onChangePoint={handleSelectPoint}
      photo={photo}
      onPhotoChange={setPhoto}
      onRequestDispatched={handleRequestDispatched}
      onSubmitSuccess={handleSubmitSuccess}
    />
  );
}

function DeliveryForm({
  point,
  userId,
  deliveryPoints,
  items,
  onItemsChange,
  notes,
  onNotesChange,
  onChangePoint,
  photo,
  onPhotoChange,
  onRequestDispatched,
  onSubmitSuccess,
}: Readonly<{
  point: GreenPoint;
  userId: string;
  deliveryPoints: GreenPoint[];
  items: DeliveryDraftItem[];
  onItemsChange: (
    next: DeliveryDraftItem[] | ((prev: DeliveryDraftItem[]) => DeliveryDraftItem[])
  ) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onChangePoint: (pointId: string) => void;
  photo: { path: string; uri: string } | null;
  onPhotoChange: (newPhoto: { path: string; uri: string } | null) => void;
  onRequestDispatched: () => void;
  onSubmitSuccess: () => void;
}>) {
  const loader = useCallback(() => getDeliveryRates(point.companyId), [point.companyId]);
  const { data: rates, error: ratesError, refresh: refreshRates } = usePortalData(loader);

  // Modal states
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [pointModalVisible, setPointModalVisible] = useState(false);
  const [lastActionSource, setLastActionSource] = useState<'photo' | 'submit' | null>(null);

  const request = useRef<{ id: string; signature: string } | null>(null);
  const action = usePortalAction();

  // Categories still available to add as a new item
  const remainingCategories = useMemo(
    () => remainingPickupCategories(point.categories, items),
    [point.categories, items]
  );

  // Categories that can be picked in the modal when editing an existing item:
  // Excludes categories selected by OTHER items, so no category is ever duplicated
  const selectableCategoriesForModal = useMemo(
    () => selectableCategoriesForPickupItem(point.categories, items, editingItemId),
    [point.categories, items, editingItemId]
  );

  // Points estimation: total sum across all items
  const estimatedPoints = useMemo(() => {
    return items.reduce((sum, item) => {
      const unitPoints = rates?.points[item.categoryId] ?? 0;
      return sum + item.quantity * unitPoints;
    }, 0);
  }, [items, rates]);

  const handleAddItem = () => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, point.categories, () => `item-${point.id}`);
      return addPickupDraftItem(base, point.categories, createDraftItemId());
    });
  };

  const handleRemoveItem = (id: string) => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, point.categories, () => `item-${point.id}`);
      return base.filter((it) => it.id !== id);
    });
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, point.categories, () => `item-${point.id}`);
      return base.map((it) =>
        it.id === id ? { ...it, quantity: deliveryQuantity(String(qty)) } : it
      );
    });
  };

  const handleChangeCategoryForItem = (id: string, newCatId: string) => {
    onItemsChange((prev) => {
      const base = reconcilePickupDraftItems(prev, point.categories, () => `item-${point.id}`);
      return changePickupDraftItemCategory(base, id, newCatId, point.categories);
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
      const chosen = await pickDeliveryPhoto(userId);
      if (chosen) {
        // Remove previous photo if user is replacing it, to prevent orphaned files in storage
        if (photo?.path) {
          try {
            await removeDeliveryPhoto(photo.path);
          } catch {
            // ignore cleanup failure on replacement
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
      await removeDeliveryPhoto(photo.path);
      onPhotoChange(null);
    }, 'Foto retirada.');
  };

  const handleGenerateCode = () => {
    setLastActionSource('submit');
    void action.run(async () => {
      if (items.length === 0) {
        throw new Error('Seleccioná al menos un dispositivo para entregar.');
      }
      const payload = {
        pointId: point.id,
        notes: notes.trim(),
        photoPath: photo?.path ?? null,
        items: items.map((it) => ({
          categoryId: it.categoryId,
          quantity: deliveryQuantity(String(it.quantity)),
        })),
      };
      const signature = JSON.stringify(payload);
      if (!request.current || request.current.signature !== signature) {
        request.current = { id: Crypto.randomUUID(), signature };
      }
      // Notificar despacho antes del comando. Si la respuesta se pierde o entra en timeout pero
      // el servidor sí creó la entrega, el cleanup del unmount conservará la foto en Storage.
      onRequestDispatched();
      const delivery = await deliveryCommand('create', {
        ...payload,
        requestId: request.current.id,
      });
      onSubmitSuccess();
      router.replace({ pathname: '/delivery/[id]', params: { id: delivery.id } });
    }, 'Entrega registrada.');
  };

  const hasCategories = point.categories.length > 0;

  return (
    <>
      <CitizenPage title="Nueva entrega" back="/my-raee">
        {/* Card 1: Organización receptora */}
        <View style={styles.fieldSection}>
          <Text style={styles.fieldLabel}>Organización receptora</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Organización receptora: ${point.name}. Tocá para cambiar.`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => setPointModalVisible(true)}
            disabled={action.busy}
          >
            <View style={styles.cardRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="business" size={22} color={colors.primaryDark} />
              </View>
              <View style={styles.cardTextCol}>
                <Text style={styles.cardTitle}>{point.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {point.address || point.companyName || 'Dirección no especificada'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </View>
          </Pressable>
        </View>

        {!hasCategories ? (
          <View style={styles.fieldSection}>
            <Text style={styles.fieldLabel}>Dispositivos a entregar</Text>
            <View style={[styles.card, styles.emptyCategoriesCard]}>
              <View style={styles.cardRow}>
                <View style={styles.iconCircle}>
                  <Ionicons
                    name="information-circle-outline"
                    size={24}
                    color={colors.primaryDark}
                  />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>
                    Este punto no tiene dispositivos habilitados
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    Todavía no tiene categorías cargadas para recibir entregas presenciales. Elegí
                    otro punto para continuar.
                  </Text>
                </View>
              </View>
              <ActionButton title="Elegir otro punto" onPress={() => onChangePoint('')} />
            </View>
          </View>
        ) : (
          <>
            {/* Section: Dispositivos a entregar */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Dispositivos a entregar</Text>

              {items.map((item) => {
                const cat =
                  point.categories.find((c) => c.id === item.categoryId) || point.categories[0];
                const visual = cat
                  ? getCategoryVisual(cat)
                  : { icon: 'devices' as const, description: 'Dispositivo electrónico' };
                const canChangeCategory = point.categories.length > 1;

                return (
                  <View key={item.id} style={styles.card}>
                    {/* Category selector row */}
                    <Pressable
                      accessibilityRole={canChangeCategory ? 'button' : 'none'}
                      accessibilityLabel={
                        canChangeCategory
                          ? `Categoría: ${cat?.name ?? 'Dispositivo'}. Tocá para cambiar.`
                          : `Categoría: ${cat?.name ?? 'Dispositivo'}. Única categoría aceptada.`
                      }
                      accessibilityState={{ disabled: !canChangeCategory }}
                      disabled={!canChangeCategory || action.busy}
                      style={({ pressed }) => [
                        styles.cardRow,
                        canChangeCategory && pressed && styles.pressed,
                      ]}
                      onPress={() => setEditingItemId(item.id)}
                    >
                      <View style={styles.iconCircle}>
                        <MaterialCommunityIcons
                          name={visual.icon}
                          size={24}
                          color={colors.primaryDark}
                        />
                      </View>
                      <View style={styles.cardTextCol}>
                        <Text style={styles.cardTitle}>
                          {cat?.name ?? 'Categoría de residuo'}
                        </Text>
                        <Text style={styles.cardSubtitle}>{visual.description}</Text>
                        {!canChangeCategory && (
                          <Text style={styles.onlyCategoryNotice}>
                            Única categoría aceptada en este punto
                          </Text>
                        )}
                      </View>
                      {canChangeCategory ? (
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                      ) : null}
                    </Pressable>

                    {/* Divider */}
                    <View style={styles.cardDivider} />

                    {/* Stepper row with quantity label & optional remove button */}
                    <View style={styles.stepperSectionRow}>
                      <Text style={styles.stepperLabel}>Cantidad:</Text>
                      <NumericStepper
                        value={item.quantity}
                        min={1}
                        max={999}
                        onChange={(q) => handleUpdateQuantity(item.id, q)}
                        disabled={action.busy}
                        accessibilityLabel={`Cantidad de ${cat?.name ?? 'unidades'}`}
                      />
                      {items.length > 1 && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Quitar ${cat?.name ?? 'dispositivo'}`}
                          style={styles.removeItemBtn}
                          disabled={action.busy}
                          onPress={() => handleRemoveItem(item.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </Pressable>
                      )}
                    </View>

                    {rates?.points[item.categoryId] ? (
                      <Text style={styles.itemPointsHint}>
                        {rates.points[item.categoryId]} pts por unidad (
                        {(item.quantity * rates.points[item.categoryId]).toLocaleString('es-AR')} pts
                        en total)
                      </Text>
                    ) : null}
                  </View>
                );
              })}

              {/* Action: Agregar otra categoría (solo disponible si hay categorías no seleccionadas) */}
              {remainingCategories.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Agregar otra categoría de residuo"
                  style={({ pressed }) => [styles.addCategoryBtn, pressed && styles.pressed]}
                  disabled={action.busy}
                  onPress={handleAddItem}
                >
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                  <Text style={styles.addCategoryText}>+ Agregar otra categoría</Text>
                </Pressable>
              )}
            </View>

            {ratesError && (
              <View style={styles.ratesErrorBox}>
                <PortalFeedback error="No pudimos cargar los puntos estimados por categoría. Igual podés generar el código." />
                <PortalLink title="Reintentar tarifas" onPress={() => void refreshRates()} />
              </View>
            )}

            {/* Card: Estimación de puntos si hay tarifas */}
            {rates && estimatedPoints > 0 && (
              <View style={styles.estimateCallout}>
                <Ionicons name="sparkles" size={20} color={colors.primaryDark} />
                <View style={styles.cardTextCol}>
                  <Text style={styles.estimateCalloutTitle}>
                    Estimado: {estimatedPoints.toLocaleString('es-AR')} puntos globales
                  </Text>
                  <Text style={styles.estimateCalloutSubtitle}>
                    El equipo receptor verificará los dispositivos antes de acreditar tus puntos.
                  </Text>
                </View>
              </View>
            )}

            {/* Card: Notas (opcional) */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Notas (opcional)</Text>
              <View style={[styles.card, styles.notesCard]}>
                <TextInput
                  accessibilityLabel="Notas adicionales sobre tu entrega (opcional)"
                  style={styles.notesInput}
                  placeholder="Agregá información adicional sobre tu entrega (opcional)."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={2000}
                  value={notes}
                  onChangeText={onNotesChange}
                  editable={!action.busy}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>{notes.length}/2000</Text>
              </View>
            </View>

            {/* Card: Foto (opcional) */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Foto (opcional)</Text>
              {lastActionSource === 'photo' && action.error ? (
                <PortalFeedback error={action.error} />
              ) : null}
              {photo ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photo.uri }}
                    accessibilityLabel="Foto de los residuos"
                    style={styles.photoPreview}
                    resizeMode="cover"
                  />
                  <View style={styles.photoActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Cambiar foto"
                      style={styles.photoActionBtn}
                      disabled={action.busy}
                      onPress={handlePickPhoto}
                    >
                      <Ionicons name="camera-reverse-outline" size={18} color={colors.primary} />
                      <Text style={styles.photoActionText}>Cambiar foto</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto"
                      style={styles.photoActionBtn}
                      disabled={action.busy}
                      onPress={handleRemovePhoto}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      <Text style={[styles.photoActionText, { color: colors.danger }]}>Quitar</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Subir foto de los residuos (opcional)"
                  style={({ pressed }) => [
                    styles.card,
                    styles.uploadCard,
                    pressed && styles.pressed,
                  ]}
                  disabled={action.busy}
                  onPress={handlePickPhoto}
                >
                  <View style={styles.iconCircle}>
                    <Ionicons name="camera-outline" size={24} color={colors.primaryDark} />
                  </View>
                  <View style={styles.cardTextCol}>
                    <Text style={styles.cardTitle}>Subir foto</Text>
                    <Text style={styles.cardSubtitle}>
                      Podés agregar una foto de los residuos (opcional, JPG/PNG hasta 5 MB).
                    </Text>
                  </View>
                </Pressable>
              )}
            </View>

            {/* Info callout */}
            <InfoNote>
              Los puntos se acreditan cuando el receptor confirma lo recibido en el punto verde.
            </InfoNote>

            {lastActionSource === 'submit' && action.error ? (
              <PortalFeedback error={action.error} />
            ) : null}

            {/* Action Button: Generar código */}
            <View style={styles.actionContainer}>
              <ActionButton
                title="Generar código"
                loading={action.busy}
                disabled={items.length === 0}
                onPress={handleGenerateCode}
              />
            </View>
          </>
        )}
      </CitizenPage>

      {/* Modal: Selector de categoría para un item específico (sin categorías duplicadas) */}
      <Modal
        visible={editingItemId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingItemId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setEditingItemId(null)}>
          <View
            accessibilityViewIsModal
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                Categorías aceptadas
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector de categorías"
                style={styles.modalCloseBtn}
                onPress={() => setEditingItemId(null)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {selectableCategoriesForModal.map((cat) => {
                const visual = getCategoryVisual(cat);
                const currentItem = items.find((it) => it.id === editingItemId);
                const isSelected = currentItem?.categoryId === cat.id;

                return (
                  <Pressable
                    key={cat.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => {
                      if (editingItemId) {
                        handleChangeCategoryForItem(editingItemId, cat.id);
                      }
                    }}
                  >
                    <View style={styles.iconCircle}>
                      <MaterialCommunityIcons
                        name={visual.icon}
                        size={22}
                        color={colors.primaryDark}
                      />
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text style={[styles.cardTitle, isSelected && { color: colors.primaryDark }]}>
                        {cat.name}
                      </Text>
                      <Text style={styles.cardSubtitle}>{visual.description}</Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Modal: Selector de punto verde */}
      <Modal
        visible={pointModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPointModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPointModalVisible(false)}>
          <View
            accessibilityViewIsModal
            style={styles.modalSheet}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text accessibilityRole="header" style={styles.modalTitle}>
                Cambiar organización receptora
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar selector de organización"
                style={styles.modalCloseBtn}
                onPress={() => setPointModalVisible(false)}
              >
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList}>
              {deliveryPoints.map((p) => {
                const isSelected = p.id === point.id;
                return (
                  <Pressable
                    key={p.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={({ pressed }) => [
                      styles.modalItem,
                      isSelected && styles.modalItemSelected,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleChangePoint(p.id)}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name="business" size={20} color={colors.primaryDark} />
                    </View>
                    <View style={styles.cardTextCol}>
                      <Text style={[styles.cardTitle, isSelected && { color: colors.primaryDark }]}>
                        {p.name}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {p.companyName} · {p.address}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 16,
  },
  sectionHeader: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    marginBottom: 4,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  noticeBannerText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingLeft: 14,
    minHeight: 48,
    gap: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 12,
  },
  clearSearchBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldSection: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    marginLeft: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
  },
  emptyCategoriesCard: {
    gap: 16,
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
  onlyCategoryNotice: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  stepperSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepperLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  removeItemBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.dangerBackground,
  },
  itemPointsHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
  },
  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  addCategoryText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  estimateCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
  },
  estimateCalloutTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.primaryDark,
  },
  estimateCalloutSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 2,
  },
  notesCard: {
    padding: 14,
  },
  notesInput: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
    minHeight: 80,
    padding: 0,
  },
  charCounter: {
    alignSelf: 'flex-end',
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 6,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  photoContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  photoActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  photoActionText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  infoCalloutText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
  },
  actionContainer: {
    marginTop: 8,
  },
  loadingText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 12,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: 4,
  },
  pressed: {
    opacity: 0.8,
  },
  ratesErrorBox: {
    gap: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
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
  modalList: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  modalItemSelected: {
    backgroundColor: colors.surfaceSoft,
  },
});
