import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { ActionButton } from '@/components/ui/ActionButton';
import { InfoNote, RewardPhoto } from '@/components/rewards/RewardsUI';
import {
  PortalChoice,
  PortalField,
  PortalFeedback,
  PortalLoading,
  PortalBadge,
  PortalListItem,
  PortalNav,
  PortalToggle,
  portalStyles as s,
} from './PortalUI';
import { usePortalAction, usePortalData } from '@/hooks/usePortalData';
import type { PortalCompany } from '@/models/Portal';
import { pointsLabel, rewardCategories, type Reward, type RewardCategory } from '@/models/Reward';
import { getRewards, saveReward } from '@/services/reward.service';
import { matchesAdminSearch } from '@/models/AdminSearch';
import { colors } from '@/theme';

export function AdminRewards({
  companies,
  reload = 0,
}: Readonly<{ companies: PortalCompany[]; reload?: number }>) {
  const loader = useCallback(() => getRewards(undefined, true), []);
  const { data, loading, error, refresh } = usePortalData(loader);
  useEffect(() => {
    if (reload) void refresh();
  }, [reload, refresh]);
  const [selected, setSelected] = useState<Reward | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const rows = data?.filter((r) => matchesAdminSearch(search, r.id, r.title));
  if (selected)
    return (
      <RewardEditor
        key={selected === 'new' ? 'new' : selected.id}
        reward={selected === 'new' ? undefined : selected}
        companies={companies}
        close={() => {
          setSelected(null);
          void refresh();
        }}
      />
    );
  return (
    <View style={s.stack}>
      {(data?.length ?? 0) > 5 && (
        <PortalField
          label="Buscar premios por nombre o ID"
          value={search}
          onChangeText={setSearch}
        />
      )}
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {!loading && !error && data?.length === 0 && (
        <Text style={s.body}>
          Todavía no hay premios. Creá el primero para que aparezca en el catálogo.
        </Text>
      )}
      {!loading && !error && !!data?.length && rows?.length === 0 && (
        <Text style={s.body}>No encontramos premios para esta búsqueda.</Text>
      )}
      {rows?.map((reward) => (
        <PortalListItem
          key={reward.id}
          leading={
            <View style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden' }}>
              <RewardPhoto reward={reward} height={64} />
            </View>
          }
          title={reward.title}
          lines={[
            reward.businessName,
            pointsLabel(reward.pointsCost),
            reward.stock === 0 && 'Sin unidades disponibles',
          ]}
          badge={
            <PortalBadge
              label={reward.active ? 'Activo' : 'Borrador'}
              tone={reward.active ? 'success' : 'neutral'}
            />
          }
          badgeBelow
          accessibilityHint="Editar premio"
          onPress={() => setSelected(reward)}
        />
      ))}
      <ActionButton
        title="Crear premio"
        icon={<Ionicons name="add" size={24} color={colors.textOnPrimary} />}
        onPress={() => setSelected('new')}
      />
      <InfoNote>
        El comercio valida los códigos de sus premios. El ciudadano usa un único saldo global.
      </InfoNote>
    </View>
  );
}
export function RewardEditor({
  reward,
  companies,
  close,
  cancel = close,
}: Readonly<{
  reward?: Reward;
  companies: PortalCompany[];
  close: () => void;
  cancel?: () => void;
}>) {
  const activeCompanies = companies.filter((c) => c.status === 'ACTIVE');
  const [companyId, setCompanyId] = useState(reward?.companyId ?? '');
  const [companySearch, setCompanySearch] = useState('');
  const [title, setTitle] = useState(reward?.title ?? '');
  const [description, setDescription] = useState(reward?.description ?? '');
  const [category, setCategory] = useState<RewardCategory>(reward?.category ?? 'food');
  const [points, setPoints] = useState(String(reward?.pointsCost ?? ''));
  const [imageUrl, setImageUrl] = useState(reward?.imageUrl ?? '');
  const [businessName, setBusinessName] = useState(reward?.businessName ?? '');
  const [address, setAddress] = useState(reward?.address ?? '');
  const [hours, setHours] = useState(reward?.hours ?? '');
  const [stock, setStock] = useState(reward?.stock == null ? '' : String(reward.stock));
  const [latitude, setLatitude] = useState(reward?.latitude == null ? '' : String(reward.latitude));
  const [longitude, setLongitude] = useState(
    reward?.longitude == null ? '' : String(reward.longitude)
  );
  const [startsAt, setStartsAt] = useState(reward?.startsAt ?? '');
  const [endsAt, setEndsAt] = useState(reward?.endsAt ?? '');
  const [active, setActive] = useState(reward?.active ?? false);
  const action = usePortalAction();
  const dateValue = (value: string) => {
    if (!value.trim()) return null;
    if (!Number.isFinite(Date.parse(value)))
      throw new Error('Revisá las fechas de disponibilidad.');
    return new Date(value).toISOString();
  };
  return (
    <View style={s.stack}>
      <Text style={s.subtitle}>{reward ? 'Editar premio' : 'Nuevo premio'}</Text>
      <Text style={s.body}>Comercio que entregará y validará el premio</Text>
      {reward ? (
        <Text style={s.body}>
          {companies.find((c) => c.id === companyId)?.name ?? reward.businessName}
        </Text>
      ) : (
        <>
          <PortalField
            label="Buscar comercio"
            value={companySearch}
            onChangeText={setCompanySearch}
            editable={!action.busy}
          />
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {activeCompanies
              .filter((c) => matchesAdminSearch(companySearch, c.id, c.name))
              .map((c) => (
                <PortalChoice
                  key={c.id}
                  label={c.name}
                  selected={companyId === c.id}
                  disabled={action.busy}
                  onPress={() => {
                    setCompanyId(c.id);
                    setBusinessName(c.name);
                  }}
                />
              ))}
          </ScrollView>
          {activeCompanies.length === 0 && (
            <Text style={s.body}>Primero necesitás un comercio activo.</Text>
          )}
        </>
      )}
      <PortalField
        label="Nombre del premio"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
        editable={!action.busy}
      />
      <PortalField
        label="Descripción y condiciones"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={2000}
        editable={!action.busy}
      />
      <PortalNav
        items={Object.values(rewardCategories)}
        selected={rewardCategories[category]}
        onSelect={(label) =>
          setCategory(
            Object.entries(rewardCategories).find(
              ([, value]) => value === label
            )![0] as RewardCategory
          )
        }
      />
      <PortalField
        label="Costo en puntos globales"
        value={points}
        onChangeText={setPoints}
        keyboardType="number-pad"
        editable={!action.busy}
      />
      <PortalField
        label="Foto del premio (enlace https)"
        value={imageUrl}
        onChangeText={setImageUrl}
        placeholder="https://…"
        editable={!action.busy}
      />
      <PortalField
        label="Nombre visible del comercio"
        value={businessName}
        onChangeText={setBusinessName}
        maxLength={120}
        editable={!action.busy}
      />
      <PortalField
        label="Dirección de canje"
        value={address}
        onChangeText={setAddress}
        maxLength={300}
        editable={!action.busy}
      />
      <PortalField
        label="Horarios"
        value={hours}
        onChangeText={setHours}
        multiline
        maxLength={500}
        editable={!action.busy}
      />
      <PortalField
        label="Unidades disponibles (vacío = sin límite)"
        value={stock}
        onChangeText={setStock}
        keyboardType="number-pad"
        editable={!action.busy}
      />
      <Text style={s.hint}>
        Las coordenadas son opcionales y permiten mostrar la ubicación en el mapa.
      </Text>
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
      <PortalField
        label="Disponible desde (opcional)"
        value={startsAt}
        onChangeText={setStartsAt}
        placeholder="2026-10-01T09:00:00-03:00"
        editable={!action.busy}
      />
      <PortalField
        label="Disponible hasta (opcional)"
        value={endsAt}
        onChangeText={setEndsAt}
        placeholder="2026-12-31T23:59:00-03:00"
        editable={!action.busy}
      />
      <PortalToggle
        label="Publicar en el catálogo"
        value={active}
        onChange={setActive}
        disabled={action.busy}
      />
      <PortalFeedback error={action.error} />
      <ActionButton
        title="Guardar premio"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            if (!companyId || !title.trim() || !businessName.trim() || !address.trim())
              throw new Error('Completá el comercio, nombre y dirección del premio.');
            if (!/^\d+$/.test(points) || Number(points) < 1 || Number(points) > 1000000)
              throw new Error('El costo debe ser un entero entre 1 y 1.000.000 puntos.');
            if (stock !== '' && (!/^\d+$/.test(stock) || Number(stock) > 1000000))
              throw new Error('Revisá las unidades disponibles.');
            if (imageUrl && !/^https:\/\//.test(imageUrl))
              throw new Error('La foto debe tener un enlace https.');
            const lat = latitude.trim() ? Number(latitude) : null,
              lng = longitude.trim() ? Number(longitude) : null;
            if (
              (lat == null) !== (lng == null) ||
              (lat != null && (!Number.isFinite(lat) || Math.abs(lat) > 90)) ||
              (lng != null && (!Number.isFinite(lng) || Math.abs(lng) > 180))
            )
              throw new Error('Revisá la latitud y longitud.');
            const start = dateValue(startsAt),
              end = dateValue(endsAt);
            if (start && end && Date.parse(start) >= Date.parse(end))
              throw new Error('La fecha final debe ser posterior al inicio.');
            await saveReward({
              id: reward?.id,
              companyId,
              title: title.trim(),
              description,
              category,
              pointsCost: Number(points),
              imageUrl: imageUrl.trim() || null,
              businessName: businessName.trim(),
              address: address.trim(),
              hours,
              stock: stock === '' ? null : Number(stock),
              latitude: lat,
              longitude: lng,
              startsAt: start,
              endsAt: end,
              active,
            });
            close();
          }, '')
        }
      />
      <ActionButton title="Cancelar" secondary disabled={action.busy} onPress={cancel} />
    </View>
  );
}
