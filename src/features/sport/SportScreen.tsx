import { ModuleHome } from '../ModuleHome';

export default function SportScreen() {
  return (
    <ModuleHome
      title="Sport"
      description="Suivez les compétitions que vous aimez."
      cards={[
        {
          icon: 'calendar-outline',
          title: 'Calendrier sportif',
          description: 'Football, MMA, MotoGP, tennis et Jeux olympiques.',
        },
        {
          icon: 'tv-outline',
          title: 'Diffusions en France',
          description: 'Retrouvez la chaîne TV associée à chaque événement.',
        },
      ]}
    />
  );
}
