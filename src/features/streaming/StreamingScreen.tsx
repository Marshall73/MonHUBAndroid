import { ModuleHome } from '../ModuleHome';

export default function StreamingScreen() {
  return (
    <ModuleHome
      includeTopInset={false}
      title="Streaming"
      description="Repérez les nouveautés disponibles en France."
      cards={[
        {
          icon: 'sparkles-outline',
          title: 'Derniers ajouts',
          description: 'Retrouvez les films et séries qui viennent de rejoindre les catalogues.',
        },
        {
          icon: 'layers-outline',
          title: 'Par plateforme',
          description: 'Netflix, Prime Video, Disney+, Canal+ et plus encore.',
        },
      ]}
    />
  );
}
