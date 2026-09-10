# Analyse préalable — structure territoriale FEBACO

Date : 9 septembre 2026

## Périmètre

Cette analyse couvre exclusivement les ligues, ententes, clubs et équipes, selon la hiérarchie `Ligue → Entente → Club → Équipe`.

## Architecture existante

- Accès Sheets centralisé dans `lib/google-sheets.ts`.
- Un classeur est associé au bloc `structure` par `GOOGLE_SHEETS_STRUCTURE_ID`.
- La lecture transforme la première ligne en clés normalisées et expose des objets chaîne-à-chaîne.
- L'écriture existante est spécialisée pour les avatars ; aucune commande générique sûre de création ou de modification territoriale n'existe.
- Les quatre routes territoriales n'exposent actuellement que `GET`.
- Les quatre listes utilisent `DataTable`.
- Les fiches détail existent pour les ligues et les clubs. Elles n'existent pas pour les ententes et les équipes.
- Aucun formulaire territorial de création ou de modification n'existe.
- Aucun framework ni script de test n'est configuré dans `package.json`.

## Autorisation existante

- Les sessions portent les rôles `federal`, `ligue` ou `entente`.
- Les lectures des ligues, ententes et clubs appliquent `scopeFromSession` ; la route équipes vérifie seulement l'authentification et n'applique pas encore le scope territorial.
- Le code ne définit pas encore de capacité explicite de lecture/écriture. Aucun rôle d'écriture ne doit donc être inventé sans décision complémentaire.
- Les contrôles d'écriture devront être appliqués côté serveur avant toute commande Sheets.

## Écarts de mapping

### Ligues

- `pseudo_ligue` devient `sigle_ligue`.
- `email_ligue` devient `email`.
- Ajouts : `id_ligue_coc`, `date_creation`, `date_reconnaissance`, `telephone`.

### Ententes

- `pseudo_entente` devient `sigle_entente`.
- `email_entente` devient `email`.
- Ajouts : `id_entente_coc`, `date_creation`, `date_reconnaissance`, `telephone`.

### Clubs

- `id_categorie` devient `id_categorie_club`.
- `date_affiliation` reste la cible canonique ; le code lit actuellement `date_affiliation_club`.
- Suppression physique attendue de `id_ligue`, qui doit être déduit via l'entente.
- Ajouts : `id_club_coc`, `sigle_club`, `id_niveau_competitif_club`, `date_creation`, `telephone`, `email`.
- Les données actuelles utilisent parfois des libellés (`AUTONOME`, `MASCULINE`) là où la cible exige des identifiants.

### Équipes

- Ajouts : `id_equipe_coc`, `id_discipline`.
- Les données actuelles utilisent parfois des libellés (`SENIOR`, `MASCULIN`) là où la cible exige des identifiants.
- La ligue, l'entente et la province doivent être résolues par `id_club`, et non lues sur la ligne équipe.

## Champs obligatoires proposés

| Objet | Obligatoires | Facultatifs |
| --- | --- | --- |
| Ligue | `id_ligue`, `nom_ligue`, `id_province`, `statut` | tous les autres |
| Entente | `id_entente`, `nom_entente`, `id_ligue`, `id_ville`, `statut` | tous les autres |
| Club | `id_club`, `nom_club`, `id_entente`, `id_categorie_club`, `id_niveau_competitif_club`, `id_ville`, `statut` | `id_club_coc`, `sigle_club`, `id_sexe`, dates, coordonnées, observations |
| Équipe | `id_equipe`, `nom_equipe`, `id_club`, `id_discipline`, `id_categorie_age`, `id_sexe`, `statut` | `id_equipe_coc`, `observations` |

La présence obligatoire d'une ville pour les ententes et clubs est déduite du mapping cible mais n'est pas explicitement formulée dans les règles métier reçues ; elle doit être confirmée avant de figer la validation.

## Interfaces et routes concernées

| Objet | Liste | Détail | Route |
| --- | --- | --- | --- |
| Ligue | `/dashboard/ligues` | `/dashboard/ligues/[id]` | `/api/ligues` |
| Entente | `/dashboard/ententes` | À créer | `/api/ententes` |
| Club | `/dashboard/clubs` | `/dashboard/clubs/[id]` | `/api/clubs` |
| Équipe | `/dashboard/equipes` | À créer | `/api/equipes` |

## Plan d'implémentation

1. Définir le mapping canonique, les schémas de validation et la résolution des référentiels derrière une interface commune.
2. Ajouter des commandes Sheets atomiques de création et de modification avec détection d'identifiant dupliqué et invalidation du cache.
3. Appliquer uniformément l'authentification, le scope de lecture et la capacité d'écriture aux quatre routes.
4. Adapter les lectures aux parents directs et résoudre les libellés et parents indirects.
5. Compléter les listes avec chargement, erreur/réessai, ajout, modification et rendu mobile sans tableau horizontal.
6. Créer ou harmoniser les quatre fiches détail et le volet de formulaire partagé.
7. Vérifier chaque tranche par des tests de validation, commandes serveur, autorisations et comportements d'interface.
8. Exécuter TypeScript, lint, build et consigner les résultats finaux.

## Seams de test proposés

1. Validation et mapping : fonctions publiques qui transforment une commande JSON en ligne Sheets canonique.
2. Commande serveur : adaptateur Sheets injecté, observé par le résultat de création ou modification et ses erreurs métier.
3. Routes : handlers HTTP observés par statut et corps JSON avec session et adaptateur contrôlés.
4. Interface : formulaire observé par ses libellés, erreurs, état de soumission et événement de réussite.

## Décisions établies

- Ne pas créer de table `STRUCTURES`.
- Ne pas introduire de niveau `CERCLES`.
- Enregistrer uniquement le parent direct.
- Résoudre les libellés des référentiels à la lecture.
- Ne pas exposer les erreurs brutes du fournisseur Sheets.
- Ne pas écrire dans les feuilles réelles pendant les tests.

## Décisions confirmées pour l'implémentation

1. Les en-têtes physiques ont été normalisés et vérifiés avant le code.
2. Seul le rôle `federal` peut créer ou modifier.
3. `id_ville` est facultatif pour une entente et un club.
4. Les quatre seams de test documentés sont retenus.

## Tests exécutés pendant l'analyse

- Lecture des métadonnées des classeurs structure et référentiel.
- Lecture bornée des en-têtes des quatre feuilles territoriales.
- Lecture bornée des en-têtes et de lignes sentinelles des sept référentiels.
- Vérification que le classeur découvert correspond à l'identifiant configuré localement.
- Aucun ajout, aucune modification et aucune suppression dans Google Sheets.
