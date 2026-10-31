import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  PortalChoice,
  PortalField,
  PortalToggle,
  PortalFeedback,
  PortalLink,
  PortalSelect,
  portalFieldStyle,
  portalStyles as s,
} from './PortalUI';
import { usePortalAction } from '@/hooks/usePortalData';
import type { CompanyPortalData, ManagedPoint, PointInput } from '@/models/Portal';
import {
  formatTimeInput,
  groupScheduleText,
  groupedDays,
  parseSchedules,
  scheduleGroups,
  scheduleText,
  weekdays,
  type ScheduleRange,
} from '@/models/PointSchedule';
import { getDeviceCategoryGroupKey, type DeviceIntakeMode } from '@/models/DeviceCategory';
import { portalCommand, saveGreenPointDevicePolicy } from '@/services/portal.service';
import { AddressField } from './AddressField';
import { LocationPicker } from './LocationPicker';
import { joinPointAddress, splitPointAddress } from '@/models/PointAddress';
import { colors } from '@/theme';

export function CompanyPointEditor({
  data,
  point,
  onSaved,
  onCancel,
  savePoint = (input) => portalCommand('save_point', input),
}: Readonly<{
  data: CompanyPortalData;
  point: ManagedPoint | null;
  onSaved: () => Promise<void>;
  onCancel?: () => void;
  savePoint?: (input: PointInput) => Promise<unknown>;
}>) {
  const initialAddress = splitPointAddress(point?.address ?? '');
  const [name, setName] = useState(point?.name ?? ''),
    [address, setAddress] = useState(initialAddress.address);
  const [crossStreets, setCrossStreets] = useState(initialAddress.crossStreets);
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [more, setMore] = useState(false);
  const [editingAddress, setEditingAddress] = useState(!point?.address);
  const [latitude, setLatitude] = useState(point ? String(point.latitude) : ''),
    [longitude, setLongitude] = useState(point ? String(point.longitude) : '');
  const [phone, setPhone] = useState(point?.phone ?? data.details?.phone ?? ''),
    [description, setDescription] = useState(point?.description ?? '');
  const [timeZone, setTimeZone] = useState(point?.timeZone ?? 'America/Argentina/Buenos_Aires');
  const [active, setActive] = useState(point?.active ?? false),
    [pickupEnabled, setPickupEnabled] = useState(
      point?.pickupEnabled || Object.values(point?.intakePolicies ?? {}).includes('pickup')
    );
  const [intakePolicies, setIntakePolicies] = useState<Record<string, DeviceIntakeMode>>(
    point?.intakePolicies ??
      Object.fromEntries((point?.categories ?? []).map((id) => [id, 'onsite' as const]))
  );
  const [intakeConfirmed, setIntakeConfirmed] = useState(point?.intakeConfirmed ?? false);
  const intakeGroups = [
    { key: 'informatica', title: 'Informática y comunicación' },
    { key: 'electrodomesticos', title: 'Electrodomésticos' },
    { key: 'insumos', title: 'Insumos eléctricos' },
    { key: 'herramientas', title: 'Herramientas' },
    { key: 'juguetes', title: 'Juguetes y equipos' },
    { key: 'especiales', title: 'Residuos especiales' },
    { key: 'otros', title: 'Otros dispositivos' },
  ]
    .map((group) => ({
      ...group,
      categories: data.categories.filter(
        (category) => getDeviceCategoryGroupKey(category) === group.key
      ),
    }))
    .filter((group) => group.categories.length > 0);
  const setIntakeMode = (categoryId: string, mode: DeviceIntakeMode | '') => {
    setIntakePolicies((current) => {
      const { [categoryId]: _previous, ...rest } = current;
      return mode ? { ...rest, [categoryId]: mode } : rest;
    });
    if (mode === 'pickup') setPickupEnabled(true);
  };
  const [days, setDays] = useState(scheduleText(point?.schedules ?? []));
  const [ranges, setRanges] = useState(groupScheduleText(days));
  const action = usePortalAction();
  const lat = Number(latitude.replace(',', '.')),
    lng = Number(longitude.replace(',', '.'));
  const coordinate = useMemo(
    () =>
      latitude.trim() &&
      longitude.trim() &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
        ? { latitude: lat, longitude: lng }
        : null,
    [latitude, longitude, lat, lng]
  );
  return (
    <View style={s.stack}>
      <PortalField
        label="Nombre del punto verde"
        labelStyle={s.label}
        value={name}
        onChangeText={setName}
        editable={!action.busy}
      />
      <Text style={s.label}>Ubicación</Text>
      <LocationPicker
        value={coordinate}
        onChange={(value) => {
          setLatitude(String(value.latitude));
          setLongitude(String(value.longitude));
        }}
        disabled={action.busy}
      />
      <Text style={s.hint}>
        {coordinate
          ? 'Ubicación marcada. Arrastrá el marcador o tocá el mapa para ajustar la entrada.'
          : 'Tocá el mapa para marcar la ubicación antes de guardar.'}
      </Text>
      {editingAddress ? (
        <>
          <AddressField
            value={address}
            onChange={(value) => {
              setAddress(value);
              setLatitude('');
              setLongitude('');
            }}
            onSelect={(value) => {
              setAddress(value.address);
              setLatitude(String(value.latitude));
              setLongitude(String(value.longitude));
            }}
            disabled={action.busy}
          />
          <PortalField
            label="Entre calles (opcional)"
            value={crossStreets}
            onChangeText={setCrossStreets}
            maxLength={200}
            editable={!action.busy}
          />
          <Text style={s.hint}>
            La dirección y las entrecalles serán visibles para los usuarios.
          </Text>
        </>
      ) : (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 16,
            borderRadius: 12,
            backgroundColor: colors.surfaceSoft,
          }}
        >
          <Ionicons name="location" size={24} color={colors.text} />
          <Text style={[s.body, { flex: 1 }]}>{joinPointAddress(address, crossStreets)}</Text>
        </View>
      )}
      {!editingAddress && (
        <PortalLink
          title="Cambiar dirección"
          disabled={action.busy}
          onPress={() => setEditingAddress(true)}
        />
      )}
      <Text style={s.label}>Horarios de atención</Text>
      {ranges ? (
        <>
          <ScheduleGrid ranges={ranges} onChange={setRanges} disabled={action.busy} />
          <Text style={s.hint}>
            Dejá vacío el horario de los días en que el punto está cerrado.
          </Text>
          <PortalLink
            title="Configurar cada día por separado"
            disabled={action.busy}
            onPress={() => {
              setDays(groupedDays(ranges, false));
              setRanges(null);
            }}
          />
        </>
      ) : (
        <>
          <Text style={s.hint}>
            Usá 09:00-18:00. Para horario cortado: 09:00-13:00, 15:00-19:00. Dejá vacío si está
            cerrado. Un cierre anterior a la apertura corresponde al día siguiente.
          </Text>
          {weekdays.map((day, i) => (
            <PortalField
              key={day}
              label={day}
              value={days[i]}
              placeholder="Cerrado"
              editable={!action.busy}
              onChangeText={(value) => setDays(days.map((d, j) => (i === j ? value : d)))}
            />
          ))}
          {groupScheduleText(days) && (
            <PortalLink
              title="Usar horario de lunes a viernes"
              disabled={action.busy}
              onPress={() => setRanges(groupScheduleText(days))}
            />
          )}
        </>
      )}
      <Text style={s.label}>Categorías aceptadas</Text>
      <Text style={s.hint}>
        Indicá si cada dispositivo se recibe en el lugar, si requiere coordinar un retiro o si no se
        recibe. Dejá “Sin definir” lo que todavía no esté confirmado.
      </Text>
      {intakeGroups.map((group) => (
        <View key={group.key} style={{ gap: 8 }}>
          <Text style={s.hint}>{group.title}</Text>
          <View style={intakeCard}>
            {group.categories.map((c, i) => (
              <View
                key={c.id}
                style={{ padding: 12, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
              >
                <PortalSelect
                  label={c.name}
                  compact
                  value={intakePolicies[c.id] ?? ''}
                  options={intakeOptions}
                  onChange={(mode) => setIntakeMode(c.id, mode)}
                  disabled={action.busy}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
      <PortalChoice
        label="Confirmo que la información está actualizada para este punto"
        selected={intakeConfirmed}
        onPress={() => setIntakeConfirmed(!intakeConfirmed)}
        disabled={action.busy}
      />
      <PortalLink
        title={more ? 'Ocultar más opciones' : 'Más opciones'}
        disabled={action.busy}
        onPress={() => setMore(!more)}
      />
      {more && (
        <>
          <PortalLink
            title={manualCoordinates ? 'Ocultar coordenadas' : 'Ingresar coordenadas manualmente'}
            onPress={() => setManualCoordinates(!manualCoordinates)}
            disabled={action.busy}
          />
          {manualCoordinates && (
            <>
              <PortalField
                label="Latitud"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numbers-and-punctuation"
                editable={!action.busy}
              />
              <PortalField
                label="Longitud"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numbers-and-punctuation"
                editable={!action.busy}
              />
            </>
          )}
          <PortalField
            label="Teléfono de contacto"
            value={phone}
            onChangeText={setPhone}
            editable={!action.busy}
          />
          <PortalField
            label="Descripción"
            value={description}
            onChangeText={setDescription}
            multiline
            editable={!action.busy}
          />
          <PortalLink
            title={advanced ? 'Ocultar zona horaria' : 'Cambiar zona horaria'}
            onPress={() => setAdvanced(!advanced)}
            disabled={action.busy}
          />
          {advanced && (
            <PortalField
              label="Zona horaria"
              value={timeZone}
              onChangeText={setTimeZone}
              editable={!action.busy}
            />
          )}
          <PortalToggle
            label="Ofrece retiros"
            value={pickupEnabled}
            onChange={setPickupEnabled}
            disabled={action.busy}
          />
        </>
      )}
      <PortalSelect
        label="Estado"
        compact
        value={active ? 'published' : 'draft'}
        options={[
          { value: 'published', label: 'Publicado' },
          { value: 'draft', label: 'Borrador' },
        ]}
        onChange={(value) => setActive(value === 'published')}
        disabled={action.busy}
      />
      <Text style={s.hint}>
        Los puntos publicados aparecen en Puntos verdes; los borradores sólo los ve tu equipo.
      </Text>
      <PortalFeedback error={action.error} />
      <ActionButton
        title="Guardar cambios"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            const lat = Number(latitude.replace(',', '.')),
              lon = Number(longitude.replace(',', '.'));
            if (
              !latitude.trim() ||
              !longitude.trim() ||
              !Number.isFinite(lat) ||
              !Number.isFinite(lon) ||
              lat < -90 ||
              lat > 90 ||
              lon < -180 ||
              lon > 180
            )
              throw new Error('Ingresá coordenadas válidas para ubicar el punto en el mapa.');
            if (intakeConfirmed && data.categories.some((category) => !intakePolicies[category.id]))
              throw new Error(
                'Asigná un estado a cada dispositivo antes de confirmar la política.'
              );
            const saved = await savePoint({
              id: point?.id,
              companyId: data.company.id,
              name,
              address: joinPointAddress(address, crossStreets),
              latitude: lat,
              longitude: lon,
              phone,
              description,
              timeZone,
              active,
              pickupEnabled,
              categories: data.categories
                .filter((category) => intakePolicies[category.id] === 'onsite')
                .map((category) => category.id),
              schedules: parseSchedules(ranges ? groupedDays(ranges) : days),
            });
            const savedId =
              point?.id ??
              (saved && typeof saved === 'object' && 'id' in saved
                ? String((saved as { id: unknown }).id)
                : '');
            if (!savedId)
              throw new Error('No pudimos identificar el punto para guardar su política.');
            const entries = Object.entries(intakePolicies).map(([deviceCategoryId, mode]) => ({
              deviceCategoryId,
              mode,
            }));
            await saveGreenPointDevicePolicy(savedId, intakeConfirmed, entries);
            await onSaved();
          })
        }
      />
      {onCancel && (
        <PortalLink title="Cancelar edición" disabled={action.busy} onPress={onCancel} />
      )}
    </View>
  );
}
function ScheduleGrid({
  ranges,
  onChange,
  disabled,
}: Readonly<{
  ranges: ScheduleRange[];
  onChange: (ranges: ScheduleRange[]) => void;
  disabled: boolean;
}>) {
  const set = (i: number, key: keyof ScheduleRange, value: string) =>
    onChange(ranges.map((r, j) => (i === j ? { ...r, [key]: formatTimeInput(value) } : r)));
  const input = (i: number, key: keyof ScheduleRange, label: string) => (
    <TextInput
      accessibilityLabel={`${scheduleGroups[i].label}, ${label}`}
      value={ranges[i][key]}
      onChangeText={(value) => set(i, key, value)}
      placeholder="--:--"
      placeholderTextColor={s.hint.color}
      keyboardType="number-pad"
      maxLength={5}
      editable={!disabled}
      style={[portalFieldStyle, { width: 84, textAlign: 'center' }]}
    />
  );
  return (
    <View style={{ gap: 8 }}>
      {scheduleGroups.map(({ label }, i) => (
        <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[s.body, { flex: 1 }]}>{label}</Text>
          {input(i, 'opens', 'apertura')}
          <Text style={s.hint}>a</Text>
          {input(i, 'closes', 'cierre')}
        </View>
      ))}
    </View>
  );
}
const intakeOptions: { value: DeviceIntakeMode | ''; label: string }[] = [
  { value: '', label: 'Sin definir' },
  { value: 'onsite', label: 'Se recibe en el lugar' },
  { value: 'pickup', label: 'Requiere coordinar retiro' },
  { value: 'not_accepted', label: 'No se recibe' },
];
const intakeCard = {
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
  backgroundColor: colors.surface,
} as const;
