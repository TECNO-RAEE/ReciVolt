import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { RewardThumbnail } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { brand } from '@/config/brand';
import { usePortalData } from '@/hooks/usePortalData';
import { matchesAdminSearch } from '@/models/AdminSearch';
import { pointsLabel } from '@/models/Reward';
import { getRewards } from '@/services/reward.service';
import {
  PortalBadge,
  PortalField,
  PortalListItem,
  PortalLoading,
  portalStyles as s,
} from './PortalUI';

export function CompanyRewards({ companyId }: Readonly<{ companyId: string }>) {
  const loader = useCallback(() => getRewards(companyId, true), [companyId]);
  const { data, loading, error, refresh } = usePortalData(loader);
  const [search, setSearch] = useState('');
  const [now] = useState(() => Date.now());
  const rows = data?.filter((r) => matchesAdminSearch(search, r.title, r.id));
  return (
    <View style={s.stack}>
      <Text style={s.body}>
        Premios de tu empresa. {brand.name} administra su publicación; tu equipo valida los códigos al
        entregarlos.
      </Text>
      {(data?.length ?? 0) > 0 && (
        <PortalField label="Buscar premios por nombre" value={search} onChangeText={setSearch} />
      )}
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {!loading && !error && data?.length === 0 && (
        <View style={s.stack}>
          <Text style={s.body}>Todavía no hay premios asignados a tu empresa.</Text>
          <ActionButton
            title="Proponer un premio"
            onPress={() => router.push('/contact?topic=reward')}
          />
        </View>
      )}
      {!loading && !error && Boolean(data?.length) && rows?.length === 0 && (
        <Text style={s.body}>No encontramos premios para esta búsqueda.</Text>
      )}
      {rows?.map((r) => {
        const expired = Boolean(r.endsAt && Date.parse(r.endsAt) <= now);
        return (
          <PortalListItem
            key={r.id}
            leading={<RewardThumbnail reward={r} size={56} />}
            title={r.title}
            badge={
              <PortalBadge
                label={expired ? 'Vencido' : r.active ? 'Publicado' : 'Borrador'}
                tone={expired ? 'danger' : r.active ? 'success' : 'neutral'}
              />
            }
            badgeBelow
            lines={[
              pointsLabel(r.pointsCost),
              r.stock == null
                ? 'Sin límite de unidades'
                : r.stock === 0
                  ? 'Sin unidades disponibles'
                  : `${r.stock} unidades`,
              r.address,
            ]}
          />
        );
      })}
    </View>
  );
}
