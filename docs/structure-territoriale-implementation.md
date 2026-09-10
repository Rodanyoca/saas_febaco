# Rapport d'implémentation — structure territoriale

## Capacités livrées

- Création par `POST /api/ligues`, `/api/ententes`, `/api/clubs` et `/api/equipes`.
- Modification par `PUT /api/{objet}/[id]`.
- Contrôle serveur obligatoire du rôle `federal`.
- Validation des champs, statuts, e-mails, dates, parents directs et référentiels.
- Identifiants générés côté serveur et écrits comme texte.
- Une seule écriture Sheets par commande, par recherche des colonnes selon leur nom.
- Conservation des colonnes historiques non exposées, dont `id_ligue_historique`.
- Volet partagé de création/modification, blocage des doubles soumissions et conservation des valeurs en erreur.
- Listes en cartes sur mobile, actions accessibles et vues détail ajoutées pour ententes et équipes.

## Compatibilité historique

Les résolutions de référentiels acceptent temporairement les libellés historiques de catégorie, sexe et catégorie d'âge ainsi que les identifiants provinciaux `PRO01`. Toute écriture nouvelle exige un identifiant canonique.

## Tests

- 8 tests unitaires de validation et de génération d'identifiants.
- TypeScript et build de production complètent la validation technique.
- Aucun test n'écrit dans les feuilles réelles.

## Limites

- Les tests automatisés couvrent actuellement le seam pur de validation/génération. Les adapters Sheets, routes et interactions navigateur nécessitent encore des doublures injectables plus complètes pour une couverture exhaustive.
- La résolution visuelle de certains champs historiques reste dépendante de la complétude des référentiels.
