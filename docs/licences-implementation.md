# Implémentation du module Licences FEBACO

## Sources vérifiées

Lecture réelle effectuée le 13 septembre 2026, sans écriture :

- `04_FEBACO_LICENCE` (`1Jy35NhhvprjLj2k_Exu90yzkSaNXvr-JFdUd9RbrGBY`) : `ATHLETE_LICENCES` et `ACTEURS_LICENCES` ;
- `03_FEBACO_AFFILIATIONS` : `ATHLETE_AFFILIATIONS` ;
- `00_FEBACO_REFERENTIEL` : `SAISON`, `STATUT_LICENCE`, `CYCLES_LICENCES`, `TYPES_ACTEURS`, `STATUTS_AFFILIATION` et `FORMATS_ID` ;
- classeurs Acteurs et Structure : résolution des athlètes, équipes, clubs, ententes et ligues.

`ATHLETE_LICENCES` contient exactement : `id_licence`, `id_athlete`, `id_saison`, `id_affiliation_athlete`, `numero_licence`, `date_delivrance`, `id_statut_licence`, `observations`. La feuille était vide lors du contrôle. Aucune date de validité ni aucun cycle n’est écrit pour un athlète.

## Architecture

`lib/licences.ts` est le module métier central. Son interface couvre la liste enrichie et filtrée, l’éligibilité individuelle/équipe, le renouvellement atomique et le PUT administratif. Les dépendances Sheets sont injectables ; les tests utilisent uniquement des adaptateurs mémoire.

Routes :

- `GET /api/licences` : consultation authentifiée et filtrée selon le scope territorial ;
- `GET /api/licences/eligibilite` : affiliations admissibles et licence existante ;
- `POST /api/licences/renouveler` : mutation fédérale individuelle ou collective ;
- `PUT /api/licences/[id]` : modification fédérale des seuls champs administratifs ;
- `GET /api/athlete-licences` : historique de la fiche Athlète raccordé à la source canonique.

La page `/dashboard/licences` utilise un seul `LicenceEditor` adaptatif. Les listes sont tabulaires sur ordinateur et rendues en cartes sur mobile. Le lot équipe conserve visibles les athlètes déjà licenciés, mais les désactive et les exclut de la commande.

## Règles appliquées

- affiliation `SAF001`, athlète et équipe résolus uniquement par identifiants ;
- affiliation non clôturée à la date courante ;
- unicité `id_athlete + id_saison` ;
- validation complète avant l’unique écriture batch ;
- champs relationnels et `id_licence` immuables au PUT ;
- statuts exclusivement issus de `STATUT_LICENCE` ;
- lecture territoriale dérivée par `équipe → club → entente → ligue` ;
- mutations réservées au rôle `federal` côté serveur.

## Décision en attente

`FORMATS_ID` ne contient aucun format pour les licences. Le format proposé est `BKB-LIC-AAAA-######`. Tant qu’il n’est pas confirmé, la commande réelle renvoie `FORMAT_ID_LICENCE_NON_CONFIGURE` avant toute écriture. `numero_licence` reste une donnée administrative libre et distincte.

## Vérification

Les tests automatisés passent par des adaptateurs injectés et ne contactent jamais les classeurs réels. Les seules opérations réelles réalisées pendant l’analyse sont des lectures de métadonnées, d’en-têtes et de lignes sentinelles.
