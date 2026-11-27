import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SearchBar } from '@/components/discovery/SearchBar';
import { CompanyPage } from '@/components/portal/CompanyPage';
import { PortalBadge, PortalLink, usePortalStyles } from '@/components/portal/PortalUI';
import { InfoCard } from '@/components/ui/InfoCard';
import { SpringPressable } from '@/components/ui/SpringPressable';
import { brand } from '@/config/brand';
import { matchesAdminSearch } from '@/models/AdminSearch';
import type { CompanyPortalData } from '@/models/Portal';
import { motion, useColors } from '@/theme';

export default function CompanyPointsScreen() {
  return (
    <CompanyPage title="Puntos verdes" ownerOnly>
      {(data) => <CompanyPoints data={data} />}
    </CompanyPage>
  );
}
function CompanyPoints({ data }: Readonly<{ data: CompanyPortalData }>) {
  const colors = useColors();
  const s = usePortalStyles();
  const [search, setSearch] = useState('');
  const filtered = data.points.filter((p) => matchesAdminSearch(search, p.name, p.id));
  return (
    <>
      <Text style={s.body}>
        Revisá la ubicación, los horarios y qué dispositivos recibe cada punto. El alta de nuevos
        puntos la realiza {brand.name}.
      </Text>
      {data.points.length > 3 && (
        <View style={{ gap: 8 }}>
          <Text style={s.body}>Buscar puntos por nombre o ID</Text>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            label="Buscar puntos por nombre o ID"
            placeholder="Nombre o ID del punto"
          />
        </View>
      )}
      {data.points.length === 0 && (
        <Text style={s.body}>
          Todavía no hay puntos verdes. El equipo de {brand.name} coordina el alta de nuevos puntos.
        </Text>
      )}
      {data.points.length > 0 && filtered.length === 0 && (
        <Text style={s.body}>No encontramos puntos para esta búsqueda.</Text>
      )}
      {filtered.map((p) => (
        <SpringPressable
          key={p.id}
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ${p.active ? 'Publicado' : 'Borrador'}${p.intakeConfirmed ? '' : ', política pendiente'}`}
          accessibilityHint="Editar punto y horarios"
          pressScale={motion.scale.card}
          style={{ minHeight: 44 }}
          onPress={() => router.push(`/company/green-point/${p.id}`)}
        >
          <InfoCard
            icon={{ name: 'location-outline' }}
            title={p.name}
            subtitle={`${p.active ? 'Publicado' : 'Borrador'} · ${p.address}`}
            right={<Ionicons name="chevron-forward" size={20} color={colors.text} />}
          >
            <View style={{ gap: 8, marginTop: 8 }}>
              {!p.intakeConfirmed && <PortalBadge label="Política pendiente" tone="neutral" />}
              <Text style={s.hint}>
                {data.categories
                  .filter((c) => p.categories.includes(c.id))
                  .map((c) => c.name)
                  .join(' · ') || 'Sin categorías aceptadas'}
              </Text>
            </View>
          </InfoCard>
        </SpringPressable>
      ))}
      <PortalLink
        title="Solicitar punto verde"
        onPress={() => router.push('/contact?topic=point')}
      />
    </>
  );
}
