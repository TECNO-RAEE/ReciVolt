import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { usePortalData } from '@/hooks/usePortalData';
import { getRewards } from '@/services/reward.service';
import { matchesAdminSearch } from '@/models/AdminSearch';
import { RewardPhoto } from '@/components/rewards/RewardsUI';
import { brand } from '@/config/brand';
import { PortalField, PortalLoading, portalStyles as s } from './PortalUI';

export function CompanyRewards({ companyId }: Readonly<{ companyId: string }>) {
  const loader = useCallback(() => getRewards(companyId, true), [companyId]);
  const { data, loading, error, refresh } = usePortalData(loader);
  const [search, setSearch] = useState('');
  const rows = data?.filter((r) => matchesAdminSearch(search, r.title, r.id));
  return (
    <View style={s.stack}>
      <Text style={s.body}>
        Premios de tu empresa. {brand.name} administra su publicación; tu equipo valida los códigos al
        entregarlos.
      </Text>
      <PortalField label="Buscar premios por nombre o ID" value={search} onChangeText={setSearch} />
      <PortalLoading loading={loading} error={error} retry={() => void refresh()} />
      {!loading && !error && !rows?.length && (
        <Text style={s.body}>
          {data?.length
            ? 'No encontramos premios para esta búsqueda.'
            : 'Todavía no hay premios asignados a tu empresa.'}
        </Text>
      )}
      {rows?.map((r) => (
        <View key={r.id} style={s.row}>
          <View style={{ flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 80, borderRadius: 8, overflow: 'hidden' }}>
              <RewardPhoto reward={r} height={80} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.subtitle}>{r.title}</Text>
              <Text style={s.body}>{r.pointsCost} puntos</Text>
              <Text style={s.hint}>
                {r.active ? 'Publicado' : 'Borrador'} ·{' '}
                {r.stock == null ? 'Sin límite de unidades' : `${r.stock} unidades`}
              </Text>
            </View>
          </View>
          <Text style={s.body}>{r.address}</Text>
          <Text selectable style={s.hint}>
            ID: {r.id}
          </Text>
        </View>
      ))}
    </View>
  );
}
