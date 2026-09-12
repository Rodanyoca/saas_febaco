# Contexte métier FEBACO

## Structure territoriale

- **Ligue** : premier niveau territorial de la FEBACO. Une ligue est rattachée à une province.
- **Entente** : subdivision territoriale appartenant obligatoirement à une ligue.
- **Club** : organisation sportive appartenant obligatoirement à une entente.
- **Équipe** : unité sportive appartenant obligatoirement à un club.
- **Parent direct** : relation hiérarchique enregistrée sur l'objet enfant.
- **Parent indirect** : relation déduite en remontant les parents directs et jamais enregistrée sur l'objet enfant.
- **Identifiant FEBACO** : identifiant stable propre à l'objet, non modifiable après sa création.
- **Identifiant COC** : correspondance nationale facultative de l'objet auprès du Comité olympique congolais.
- **Référentiel** : liste contrôlée dont l'interface enregistre l'identifiant et présente le libellé associé.

## Invariants

La hiérarchie officielle et exhaustive est :

`Ligue → Entente → Club → Équipe`

Il n'existe ni niveau « Cercle » ni structure territoriale générique dans ce contexte.

Les statuts d'une structure territoriale sont `ACTIF` et `INACTIF`.

## Compétitions

- **Compétition permanente** : identité stable d’une compétition récurrente, indépendante de ses occurrences datées. _Éviter_ : édition, tournoi annuel.
- **Édition de compétition** : occurrence opérationnelle et datée d’une compétition permanente. Elle porte les épreuves, engagements, intervenants, phases, matchs, résultats et classements. _Éviter_ : compétition permanente.
- **Épreuve de compétition** : tableau sportif homogène d’une édition, défini notamment par une discipline, une catégorie d’âge et un sexe. _Éviter_ : phase, groupe.

- **Équipe engagée** : équipe de club inscrite administrativement à une compétition. Une même équipe ne peut être engagée qu’une fois dans cette compétition.
- **Unité de compétition** : représentation sportive d’une équipe engagée utilisée pour les affectations, matchs, résultats et classements.
- **Participant de compétition** : personne physique explicitement inscrite comme athlète, arbitre, officiel, médecin ou autre acteur. À ne pas confondre avec une équipe engagée.

- **Type de phase** : ce que représente sportivement une phase (`QUALIFICATION`, `QUART_FINALE`, `FINALE`, etc.). Il ne détermine jamais son fonctionnement.
- **Mode de phase** : règle de fonctionnement indépendante du type. `GROUPES` exige des groupes et produit un classement ; `ELIMINATION_DIRECTE` n’utilise aucun groupe et détermine un vainqueur ; `AUTRE` reste manuel.
- **Affectation phase-unité** : relation canonique indiquant qu’une unité active participe à une phase, avec un groupe facultatif selon le mode.
- **Groupe** : subdivision obligatoire en mode `GROUPES`, interdite en mode `ELIMINATION_DIRECTE` et facultative en mode `AUTRE`.
- **Qualification** : affectation manuelle, explicite et traçable d’une unité à une phase ultérieure de la même épreuve ; elle n’est jamais déduite automatiquement d’un classement ou d’un résultat.
