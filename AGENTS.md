# Projet : Hub Personnel Android

## Stack Technique & UI
- **Framework** : React Native avec Expo (SDK récent) et Expo Router. La pile de navigation est définie dans `app/_layout.tsx`.
- **Langage** : TypeScript strict.
- **Style (OBLIGATOIRE)** : Utiliser exclusivement **NativeWind** (classes Tailwind via la prop `className`). Ne jamais créer de `StyleSheet.create` sauf nécessité technique absolue.
- **Thème** : Dark Mode par défaut. Fond principal `#09090B` (zinc-950), cartes `#18181B` (zinc-900) avec bordure fine `#27272A` (zinc-800), texte principal blanc `#FAFAFA`, couleur d'accentuation `#3B82F6` (blue-500) ou `#10B981` (emerald-500).
- **Icônes** : `@expo/vector-icons` (privilégier `Ionicons` ou `MaterialCommunityIcons`).
- **Animations** : `moti` (`MotiView`) et `react-native-reanimated` pour animer l'apparition des cartes et les transitions fluides.
- **Stockage local** : `@react-native-async-storage/async-storage` pour sauvegarder les favoris (cinéma, flux RSS, sports).

## Architecture Modulaire
- Isoler la logique et les composants de chaque fonctionnalité dans `src/features/<nom-du-module>/` (ex: `src/features/sport`, `src/features/cinema`, `src/features/rss`, `src/features/github`, `src/features/trailers`, `src/features/streaming`).
- La barre du bas dans `app/(tabs)/` est réservée aux trois onglets principaux (Sport, Cinéma, RSS) et à l’onglet Hub.
- Le Hub affiche une grille extensible de modules secondaires. Streaming, Trailers et GitHub disposent de routes dédiées dans `app/(modules)/` et s’ouvrent dans la pile, avec un retour au Hub.
- Pour ajouter un module secondaire, placer son écran dans `src/features/<nom-du-module>/`, ajouter sa route dans `app/(modules)/`, puis ajouter sa tuile au tableau `hubModules` dans `src/features/hub/HubScreen.tsx`.
- Les fichiers de route hors layouts restent légers et réexportent les écrans depuis `src/features/`.
- **Résilience** : Chaque module gère ses propres erreurs réseau et états de chargement (skeletons ou loaders) sans jamais bloquer le reste de l'application.
- Ajouter un `RefreshControl` (Pull-to-Refresh) sur toutes les listes.

## Modules de l'application
1. **Sport** : Matchs et événements (Foot, MMA, MotoGP, Tennis, JO) avec la chaîne TV de diffusion en France.
2. **RSS** : Lecteur de flux RSS personnalisable (ajout/suppression d'URLs par l'utilisateur).
3. **Cinéma** : Programme des séances fourni par `data/cinema.json` via GitHub Raw, avec filtres par salle et par titre. Les fiches dépliables affichent les détails du film et un lien vers son site.
4. **GitHub Trends** : Dépôts tendance du jour (langage, description, étoiles).
5. **Trailers** : Nouvelles bandes-annonces films et jeux vidéo (via flux YouTube/RSS fournis).
6. **Streaming** : Nouveautés films et séries par plateforme en France (Netflix, Prime, Disney+, Canal+, etc.).
