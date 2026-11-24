import { brand } from './brand';

// Leave unset until ReciVolt has an official contact address.
export const contactEmail = process.env.EXPO_PUBLIC_CONTACT_EMAIL?.trim() || '';

export const contactTopics = {
  support: {
    title: 'Soporte o consulta',
    subject: `Consulta sobre ${brand.name}`,
    fields: [
      'Tu nombre y email de contacto',
      'Pantalla o sección donde surgió la duda',
      'Descripción de tu consulta o problema',
    ],
  },
  point: {
    title: 'Sumarme como punto verde',
    subject: `Quiero sumarme como punto verde a ${brand.name}`,
    fields: [
      'Nombre del punto verde o institución',
      'Nombre del responsable',
      'Email y teléfono de contacto',
      'Dirección y localidad',
      'Dispositivos que podés recibir',
      'Días y horarios de atención',
    ],
  },
  reward: {
    title: 'Ofrecer un premio',
    subject: `Propuesta de premio para ${brand.name}`,
    fields: [
      'Nombre del comercio u organización',
      'Nombre del responsable',
      'Email y teléfono de contacto',
      'Premio o beneficio que ofrecés',
      'Condiciones, cupos y vigencia',
      'Dirección donde se puede canjear',
    ],
  },
} as const;

export type ContactTopicKey = keyof typeof contactTopics;

export function resolveContactTopic(topic?: string | string[]): ContactTopicKey {
  const value = Array.isArray(topic) ? topic[0] : topic;
  if (value === 'point' || value === 'reward' || value === 'support') return value;
  return 'support';
}

export function buildContactMailBody(topic: ContactTopicKey): string {
  const fields = contactTopics[topic].fields;
  return `Hola, equipo de ${brand.name}.\n\n${fields.map((field) => `${field}: `).join('\n')}\n\nGracias.`;
}
