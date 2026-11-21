import { ModuleHome } from '../ModuleHome';

export default function TrailersScreen() {
  return (
    <ModuleHome
      includeTopInset={false}
      title="Trailers"
      description="Les prochaines sorties en vidéo."
      cards={[
        {
          icon: 'videocam-outline',
          title: 'Bandes-annonces cinéma',
          description: 'Découvrez les premières images des films à venir.',
        },
        {
          icon: 'game-controller-outline',
          title: 'Jeux vidéo',
          description: 'Retrouvez les annonces et extraits de gameplay.',
        },
      ]}
    />
  );
}
