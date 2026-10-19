import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { CitizenPage, InfoNote, rewardStyles as s } from '@/components/rewards/RewardsUI';
import { ActionButton } from '@/components/ui/ActionButton';
import { ImpactPlant } from '@/components/ui/EcoArtwork';

export default function ImpactScreen() {
  return (
    <CitizenPage title="Mi impacto">
      <View style={[s.card, { alignItems: 'center' }]}>
        <ImpactPlant />
        <Text style={s.title}>Pequeñas acciones, grandes cambios</Text>
        <Text style={s.body}>
          Los aparatos que ya no usás pueden contener materiales recuperables. Acercalos a un punto
          verde para que reciban el tratamiento adecuado.
        </Text>
      </View>
      <InfoNote>
        Buscá un punto verde y revisá qué dispositivos recibe antes de llevarlos. Tus entregas suman
        puntos cuando el equipo confirma la recepción.
      </InfoNote>
      <ActionButton title="Encontrar puntos verdes" onPress={() => router.push('/green-points')} />
      <ActionButton title="Ver mis entregas" secondary onPress={() => router.push('/my-raee')} />
    </CitizenPage>
  );
}
