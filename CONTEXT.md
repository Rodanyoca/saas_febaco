# Contexte métier FEBACO

## Structure territoriale

- **Ligue** : premier niveau territorial de la FEBACO. Les villes affichées sur sa fiche sont calculées depuis ses ententes (`LIGUE → ENTENTES → VILLES`) ; aucun identifiant de ville n'est ajouté à la feuille `LIGUES`.
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

## Licences

- **Licence d’athlète** : autorisation fédérale d’un athlète pour une saison complète, enregistrée dans `ATHLETE_LICENCES` et obligatoirement rattachée à une affiliation réelle. _Éviter_ : licence d’équipe, période de validité propre.
- **Renouvellement individuel** : création de la licence d’une nouvelle saison depuis une affiliation admissible ; si la licence de la saison existe déjà, l’action devient une modification administrative.
- **Renouvellement collectif** : création atomique de plusieurs licences d’athlètes affiliés à une même équipe. Il ne crée jamais une licence au nom de l’équipe.
- **Numéro de licence** : référence administrative ou publique modifiable, distincte de l’identifiant technique immuable `id_licence`.
- **Licence d’acteur** : autorisation fédérale individuelle d’un coach, officiel, arbitre ou médecin, rattachée directement au type et à l’acteur, sans saison, équipe ni affiliation.
- **Renouvellement d’une licence d’acteur** : création d’une nouvelle ligne de licence et conservation de toutes les périodes précédentes dans l’historique de l’acteur. Les périodes de validité ne peuvent pas se chevaucher.
- **Statut effectif d’une licence d’acteur** : état affiché calculé à la date du jour pour une licence `ACTIVE` (`À venir`, `Valide` ou `Expirée`) ; un état manuel `Suspendue`, `Clôturée` ou `Annulée` reste prioritaire.

## Compétitions

- **Compétition** : entité opérationnelle et datée enregistrée directement dans `COMPETITIONS`. Elle porte les épreuves, engagements, intervenants, phases, matchs, résultats et classements.
- **Numéro d’édition** : propriété facultative d’une compétition (`numero_edition`) ; il ne crée ni entité parente ni relation vers une compétition permanente.
- **Épreuve de compétition** : tableau sportif homogène d’une compétition, défini notamment par une discipline, une catégorie d’âge et un sexe. _Éviter_ : phase, groupe.

- **Équipe engagée** : équipe de club inscrite administrativement à une compétition. Une même équipe ne peut être engagée qu’une fois dans cette compétition.
- **Unité de compétition** : représentation sportive d’une équipe engagée utilisée pour les affectations, matchs, résultats et classements.
- **Participant de compétition** : personne physique explicitement inscrite comme athlète, arbitre, officiel, médecin ou autre acteur. À ne pas confondre avec une équipe engagée.
- **Validité de participation** : appréciation informative et calculée indiquant si la licence d’un intervenant couvre une compétition. Elle est distincte du statut administratif de l’inscription et ne bloque jamais l’ajout de l’intervenant.

- **Type de phase** : ce que représente sportivement une phase (`QUALIFICATION`, `QUART_FINALE`, `FINALE`, etc.). Il ne détermine jamais son fonctionnement.
- **Mode de phase** : règle de fonctionnement indépendante du type. `GROUPES` exige des groupes et produit un classement ; `ELIMINATION_DIRECTE` n’utilise aucun groupe et détermine un vainqueur ; `AUTRE` reste manuel.
- **Affectation phase-unité** : relation canonique indiquant qu’une unité active participe à une phase, avec un groupe facultatif selon le mode.
- **Groupe** : subdivision obligatoire en mode `GROUPES`, interdite en mode `ELIMINATION_DIRECTE` et facultative en mode `AUTRE`.
- **Qualification** : affectation manuelle, explicite et traçable d’une unité à une phase ultérieure de la même épreuve ; elle n’est jamais déduite automatiquement d’un classement ou d’un résultat.

## Équipes nationales

- **Équipe nationale permanente** : identité sportive stable définie par une discipline, une catégorie d’âge et un sexe. Elle ne porte ni saison, ni campagne, ni résultat.
- **Activation saisonnière** : présence d’une équipe nationale permanente pendant une saison donnée, conservée dans l’historique même lorsqu’elle devient inactive.
- **Campagne d’équipe nationale** : période opérationnelle appartenant à une activation saisonnière et portant les sélections et engagements.
- **Sélection nationale** : choix historique d’un athlète pour une campagne, avec l’affiliation réellement utilisée à cette date. Elle ne rend jamais l’athlète membre permanent de l’équipe nationale.
- **Affectation de staff national** : relation historique d’un coach, officiel, arbitre ou médecin avec une activation saisonnière entière ou une campagne précise.
- **Engagement national** : inscription d’une campagne à une épreuve et à une unité du bloc Compétitions. Il est distinct d’une sélection d’athlète.

Le cycle canonique est : `équipe permanente → activation saisonnière → campagne → sélections / staff / engagements → résultats du bloc Compétitions`.
