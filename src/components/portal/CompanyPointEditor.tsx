import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import {
  PortalChoice,
  PortalField,
  PortalToggle,
  PortalFeedback,
  PortalLink,
  portalStyles as s,
} from './PortalUI';
import { usePortalAction } from '@/hooks/usePortalData';
import type { CompanyPortalData, ManagedPoint, PointInput } from '@/models/Portal';
import { getDeviceCategoryGroupKey, type DeviceIntakeMode } from '@/models/DeviceCategory';
import { weekdays, parseSchedules, scheduleText } from '@/models/PointSchedule';
import { portalCommand, saveGreenPointDevicePolicy } from '@/services/portal.service';
import { AddressField } from './AddressField';
import { LocationPicker } from './LocationPicker';
import { joinPointAddress, splitPointAddress } from '@/models/PointAddress';

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
  onCancel: () => void;
  savePoint?: (input: PointInput) => Promise<unknown>;
}>) {
  const initialAddress = splitPointAddress(point?.address ?? '');
  const [name, setName] = useState(point?.name ?? ''),
    [address, setAddress] = useState(initialAddress.address);
  const [crossStreets, setCrossStreets] = useState(initialAddress.crossStreets);
  const [manualCoordinates, setManualCoordinates] = useState(false);
  const [advanced, setAdvanced] = useState(false);
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
  const [days, setDays] = useState(scheduleText(point?.schedules ?? []));
  const action = usePortalAction();
  const setIntakeMode = (categoryId: string, mode: DeviceIntakeMode) => {
    setIntakePolicies((current) => ({ ...current, [categoryId]: mode }));
    if (mode === 'pickup') setPickupEnabled(true);
  };
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
    <View style={s.section}>
      <Text style={s.subtitle}>{point ? 'Editar punto verde' : 'Nuevo punto verde'}</Text>
      <PortalField
        label="Nombre del punto"
        value={name}
        onChangeText={setName}
        editable={!action.busy}
      />
      <Text style={s.subtitle}>Ubicación</Text>
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
        Tocá el mapa para ubicar el punto. También podés arrastrar el marcador para ajustar la
        entrada. La dirección y las entrecalles serán visibles para los usuarios.
      </Text>
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
          ? 'Ubicación marcada. Revisá que coincida con la dirección.'
          : 'Marcá la ubicación antes de guardar.'}
      </Text>
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
      <Text style={s.subtitle}>Información del punto</Text>
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
      <Text style={s.subtitle}>Qué dispositivos recibe este punto</Text>
      <Text style={s.hint}>
        Indicá si se reciben en el lugar, si requieren coordinar un retiro o si no se reciben. Dejá
        sin seleccionar lo que todavía no esté confirmado.
      </Text>
      {intakeGroups.map((group) => (
        <View key={group.key} style={s.section}>
          <Text style={s.subtitle}>{group.title}</Text>
          {group.categories.map((c) => (
            <View key={c.id} style={s.section}>
              <Text style={s.body}>{c.name}</Text>
              <PortalChoice
                label="Se recibe en el lugar"
                selected={intakePolicies[c.id] === 'onsite'}
                disabled={action.busy}
                onPress={() => setIntakeMode(c.id, 'onsite')}
              />
              <PortalChoice
                label="Requiere coordinar retiro"
                selected={intakePolicies[c.id] === 'pickup'}
                disabled={action.busy}
                onPress={() => setIntakeMode(c.id, 'pickup')}
              />
              <PortalChoice
                label="No se recibe"
                selected={intakePolicies[c.id] === 'not_accepted'}
                disabled={action.busy}
                onPress={() => setIntakeMode(c.id, 'not_accepted')}
              />
            </View>
          ))}
        </View>
      ))}
      <PortalToggle
        label="Confirmo que la información está actualizada para este punto"
        value={intakeConfirmed}
        onChange={setIntakeConfirmed}
        disabled={action.busy}
      />
      <Text style={s.subtitle}>Horarios</Text>
      <Text style={s.hint}>
        Usá 09:00-18:00. Para horario cortado: 09:00-13:00, 15:00-19:00. Dejá vacío si está cerrado.
        Un cierre anterior a la apertura corresponde al día siguiente.
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
      <PortalToggle
        label="Ofrece retiros"
        value={pickupEnabled}
        onChange={setPickupEnabled}
        disabled={action.busy}
      />
      <PortalToggle
        label="Visible en Puntos verdes"
        value={active}
        onChange={setActive}
        disabled={action.busy}
      />
      <PortalFeedback error={action.error} />
      <ActionButton
        title="Guardar punto"
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
              schedules: parseSchedules(days),
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
      <PortalLink title="Cancelar edición" disabled={action.busy} onPress={onCancel} />
    </View>
  );
}
