# Cahier des charges détaillé — Bloc Structure territoriale FEBACO

## 1. Objet du document

Ce document définit les exigences fonctionnelles et techniques du bloc **Structure territoriale** de la plateforme FEBACO. Il couvre l’administration, la consultation et la sécurisation des quatre niveaux officiels suivants :

`Ligue → Entente → Club → Équipe`

Le document décrit l’état fonctionnel attendu et l’implémentation actuellement disponible : écrans, formulaires, règles de gestion, autorisations, relations, référentiels, Google Sheets, API, erreurs, critères d’acceptation et scénarios de recette.

## 2. Finalités métier

Le bloc doit permettre à la FEBACO de :

- disposer d’un registre territorial unique et hiérarchisé ;
- rattacher chaque entité à son parent officiel direct ;
- retrouver automatiquement les parents indirects ;
- distinguer les identifiants FEBACO des correspondances externes COC ;
- contrôler les valeurs administratives par référentiel ;
- garantir que seuls les utilisateurs habilités modifient les données ;
- limiter la visibilité des rôles territoriaux à leur propre périmètre ;
- présenter des listes et fiches détaillées adaptées au mobile et au bureau ;
- servir de source fiable aux autres blocs : acteurs, affiliations et compétitions.

## 3. Périmètre

### 3.1 Fonctions couvertes

- consultation des ligues, ententes, clubs et équipes ;
- recherche, filtrage et tri des listes ;
- consultation de fiches détaillées ;
- création des quatre types d’entités ;
- modification de leurs données administratives ;
- génération serveur des identifiants FEBACO ;
- validation des parents directs et référentiels ;
- résolution des libellés et parents indirects ;
- contrôle du périmètre territorial en lecture ;
- contrôle du rôle fédéral en écriture ;
- téléversement et affichage du logo d’un club ;
- consultation des entités enfants ;
- consultation des équipes, athlètes et membres affiliés depuis certaines fiches.

### 3.2 Fonctions exclues actuellement

- suppression d’une ligue, entente, club ou équipe ;
- archivage automatique en cascade ;
- fusion de doublons ;
- transfert libre d’une entente ayant déjà des clubs vers une autre ligue ;
- historique complet des modifications ;
- workflow de validation à plusieurs niveaux ;
- délégation d’écriture aux rôles ligue ou entente ;
- import massif depuis l’interface territoriale ;
- carte géographique interactive ;
- synchronisation complète des compétitions liées dans la fiche club ;
- gestion des dirigeants d’une ligue depuis le formulaire territorial courant.

## 4. Modèle territorial de référence

### 4.1 Hiérarchie exhaustive

La seule hiérarchie autorisée est :

1. une **Ligue** appartient à une province ;
2. une **Entente** appartient à une ligue ;
3. un **Club** appartient à une entente ;
4. une **Équipe** appartient à un club.

Il n’existe ni niveau `Cercle` ni entité générique `Structure` enregistrée dans les données.

### 4.2 Parent direct et parents indirects

Chaque ligne ne stocke que son parent direct :

| Entité | Parent direct enregistré | Parents indirects calculés |
| --- | --- | --- |
| Ligue | Province | aucun |
| Entente | Ligue | Province via la ligue |
| Club | Entente | Ligue et province via l’entente |
| Équipe | Club | Entente, ligue et province via le club |

Les parents indirects ne doivent jamais devenir des sources concurrentes. Un ancien champ tel que `id_ligue_historique` peut être conservé physiquement pour compatibilité, mais ne pilote pas la relation courante.

### 4.3 Identifiant FEBACO

Identifiant interne stable, généré côté serveur et non modifiable après création. Il sert de clé aux relations.

### 4.4 Identifiant COC

Correspondance externe facultative avec le Comité olympique congolais. Il ne remplace jamais l’identifiant FEBACO et ne sert pas de parent.

### 4.5 Statut

Les statuts autorisés pour les quatre entités sont :

- `ACTIF` ;
- `INACTIF`.

## 5. Profils et autorisations

### 5.1 Rôle fédéral

Le rôle `federal` peut :

- consulter l’ensemble du territoire ;
- créer et modifier une ligue ;
- créer et modifier une entente ;
- créer et modifier un club ;
- créer et modifier une équipe ;
- téléverser ou remplacer le logo d’un club.

### 5.2 Rôle ligue

Le rôle `ligue` est en lecture seule. Il voit :

- sa propre ligue ;
- les ententes de cette ligue ;
- les clubs rattachés à ces ententes ;
- les équipes rattachées à ces clubs.

### 5.3 Rôle entente

Le rôle `entente` est en lecture seule. Il voit :

- sa propre entente ;
- sa ligue parente ;
- les clubs de son entente ;
- les équipes de ces clubs.

### 5.4 Contrôles serveur

Le masquage des boutons ne constitue pas une autorisation. Chaque route d’écriture doit vérifier la session et le rôle côté serveur.

| Situation | Réponse attendue |
| --- | --- |
| session absente | HTTP `401` |
| écriture par ligue ou entente | HTTP `403` |
| ressource inexistante | HTTP `404` |
| valeur métier invalide | HTTP `422` |
| relation incompatible ou doublon | HTTP `409` |
| service Sheets indisponible | HTTP `503` |

## 6. Navigation générale

Les routes d’interface principales sont :

| Entité | Liste | Fiche |
| --- | --- | --- |
| Ligue | `/dashboard/ligues` | `/dashboard/ligues/[id]` |
| Entente | `/dashboard/ententes` | `/dashboard/ententes/[id]` |
| Club | `/dashboard/clubs` | `/dashboard/clubs/[id]` |
| Équipe | `/dashboard/equipes` | `/dashboard/equipes/[id]` |

Chaque liste doit proposer :

- un titre et le nombre d’éléments visibles ;
- une recherche textuelle ;
- des filtres adaptés ;
- un accès à la fiche détaillée ;
- une action de modification pour le rôle fédéral ;
- un bouton de création pour le rôle fédéral ;
- la mention `Consultation uniquement` pour les autres rôles ;
- une carte mobile sans tableau horizontal ;
- un état de chargement, un état vide et une erreur avec nouvelle tentative.

## 7. Exigences communes des formulaires

Les formulaires de création et modification utilisent un volet latéral partagé.

Règles communes :

- l’identifiant est généré par le serveur ;
- l’identifiant est immuable en modification ;
- le statut initial proposé est `ACTIF` ;
- les champs obligatoires sont signalés ;
- les valeurs de référentiel utilisent une liste de sélection ;
- les parents utilisent une liste d’entités existantes ;
- une double soumission est bloquée ;
- les valeurs saisies sont conservées en cas d’échec ;
- la première erreur de champ reçoit le focus ;
- les valeurs d’affichage `-` et `Non renseigné` ne sont jamais renvoyées comme données réelles ;
- après réussite, la liste enrichie est relue afin d’afficher immédiatement les libellés résolus.

## 8. Gestion des ligues

### 8.1 Données

| Champ | Obligatoire | Règle |
| --- | --- | --- |
| Nom de la ligue | oui | texte non vide |
| Sigle | non | texte libre |
| Province | oui | identifiant de `PROVINCES` |
| Téléphone | non | texte libre |
| E-mail | non | format e-mail valide |
| Date de création | non | date |
| Date de reconnaissance | non | ne précède pas la création |
| Identifiant COC | non | correspondance externe |
| Statut | oui | `ACTIF` ou `INACTIF` |
| Observations | non | texte libre |

### 8.2 Identifiant

L’identifiant d’une ligue est une séquence numérique sur deux caractères. Exemple : après `09`, la prochaine valeur est `10`.

### 8.3 Liste

Colonnes : identifiant, nom, sigle, province et statut. Filtres : province et statut.

### 8.4 Fiche ligue

La fiche affiche :

- les informations générales ;
- les responsables historiques disponibles à la lecture ;
- le nombre d’ententes, clubs, équipes et athlètes liés ;
- les listes d’ententes, clubs et équipes ;
- les athlètes liés avec recherche et pagination ;
- une action de modification réservée au fédéral.

Les entités liées sont calculées en suivant la hiérarchie officielle.

## 9. Gestion des ententes

### 9.1 Données

| Champ | Obligatoire | Règle |
| --- | --- | --- |
| Nom de l’entente | oui | texte non vide |
| Sigle | non | texte libre |
| Ligue | oui | ligue existante |
| Ville | non | identifiant de `VILLES` si renseigné |
| Téléphone | non | texte libre |
| E-mail | non | format valide |
| Date de création | non | date |
| Date de reconnaissance | non | ne précède pas la création |
| Identifiant COC | non | correspondance externe |
| Statut | oui | `ACTIF` ou `INACTIF` |
| Observations | non | texte libre |

### 9.2 Identifiant et code

L’identifiant est composé de l’identifiant de la ligue suivi d’une séquence locale sur deux caractères. Pour la ligue `01`, après `0101` et `0102`, la prochaine entente est `0103`.

Si `code_entente` est vide, il est déduit de la partie locale de l’identifiant.

### 9.3 Changement de ligue

Une entente qui possède déjà au moins un club ne peut pas changer de ligue. Le serveur retourne `RELATION_INCOHERENTE` en HTTP `409`. Cette règle empêche de déplacer implicitement tous les descendants.

### 9.4 Liste et fiche

La liste affiche identifiant, nom, sigle, ligue et statut. Filtres : ligue et statut.

La fiche affiche les informations générales, coordonnées, reconnaissance, identifiant COC, observations, statistiques des clubs et équipes, ainsi que la liste des clubs de l’entente.

## 10. Gestion des clubs

### 10.1 Données

| Champ | Obligatoire | Règle |
| --- | --- | --- |
| Nom du club | oui | texte non vide |
| Sigle | non | texte libre |
| Entente | oui | entente existante |
| Catégorie de club | oui | `CATEGORIES_CLUB` |
| Niveau compétitif | non | `NIVEAUX_COMPETITIFS_CLUB` |
| Sexe | non | `SEXES` |
| Ville | non | `VILLES` |
| Date de création | non | date |
| Date d’affiliation | non | date |
| Téléphone | non | texte libre |
| E-mail | non | format valide |
| Identifiant COC | non | correspondance externe |
| Statut | oui | `ACTIF` ou `INACTIF` |
| Observations | non | texte libre |
| Logo | non | JPG, PNG ou WebP, 5 Mo maximum |

### 10.2 Identifiant

L’identifiant du club est la prochaine valeur numérique globale disponible.

### 10.3 Logo

- le téléversement intervient après l’enregistrement de la ligne club ;
- le nom du média est dérivé de l’identifiant stable du club ;
- un nouveau fichier remplace le logo affiché ;
- le fichier est servi par le proxy média authentifié ;
- `logo_drive_id` et `logo_drive_url` peuvent être conservés dans la ligne ;
- si aucun logo n’existe, l’interface affiche les initiales du club.

### 10.4 Liste

Colonnes : identifiant, logo, nom, catégorie, entente, ligue et statut. Filtres : ligue, entente et statut. Le tri nominal respecte l’ordre alphabétique français.

### 10.5 Fiche club

La fiche affiche :

- identité, logo et statut ;
- informations générales et affiliation ;
- compteurs d’équipes, athlètes, coachs et médecins ;
- liste des équipes du club ;
- création et modification d’une équipe par un fédéral ;
- liste paginée des athlètes affiliés, filtrable par texte, statut et sexe ;
- staff affilié : coachs, médecins et officiels ;
- emplacement réservé aux compétitions liées.

Le rattachement d’un acteur au club passe en priorité par son affiliation à une équipe du club ou par une affiliation explicite au club.

## 11. Gestion des équipes

### 11.1 Données

| Champ | Obligatoire | Règle |
| --- | --- | --- |
| Nom de l’équipe | oui | texte non vide |
| Club | oui | club existant |
| Discipline | oui | `DISCIPLINES` |
| Catégorie d’âge | oui | `CATEGORIES_AGE` |
| Sexe | oui | `SEXES` |
| Identifiant COC | non | correspondance externe |
| Statut | oui | `ACTIF` ou `INACTIF` |
| Observations | non | texte libre |

### 11.2 Identifiant

L’identifiant est composé de l’identifiant du club et d’une séquence locale sur deux caractères. Pour le club `1`, après les équipes `101` et `102`, la prochaine équipe est `103`.

### 11.3 Liste

Colonnes : identifiant, nom, club, catégorie d’âge, sexe et statut. Filtres : club et statut.

La route accepte également des filtres ciblés : `ligueId`, `ligue`, `clubId` et `club`. Les comparaisons sont normalisées sans dépendre de la casse.

### 11.4 Fiche équipe

La fiche présente :

- identité, statut et informations générales ;
- club parent et parents indirects résolus ;
- discipline, catégorie et sexe ;
- observations ;
- athlètes, coachs et médecins affiliés ;
- période et statut de chaque affiliation ;
- éventuelles anomalies de référence.

## 12. Résolution des relations

### 12.1 Chaîne descendante

Les compteurs et listes liées suivent :

`Ligue.id → Entente.id_ligue → Club.id_entente → Équipe.id_club`

### 12.2 Chaîne ascendante

Pour une équipe :

`Équipe.id_club → Club.id_entente → Entente.id_ligue → Ligue.id_province`

### 12.3 Données orphelines

Une référence absente ne doit pas être remplacée par un parent inventé. L’interface affiche l’identifiant brut, `Non renseigné`, `Référence inconnue` ou une anomalie explicite selon le contexte.

## 13. Référentiels

La route `/api/structure-territoriale/referentiels` expose :

- `PROVINCES` ;
- `VILLES` ;
- `CATEGORIES_CLUB` ;
- `NIVEAUX_COMPETITIFS_CLUB` ;
- `DISCIPLINES` ;
- `CATEGORIES_AGE` ;
- `SEXES`.

Le formulaire enregistre uniquement l’identifiant. Le libellé est résolu à la lecture.

### 13.1 Compatibilité historique

À la lecture, le système tolère certains alias historiques :

- `pseudo_ligue` pour `sigle_ligue` ;
- `pseudo_entente` pour `sigle_entente` ;
- `email_ligue` ou `email_entente` pour `email` ;
- `id_categorie` pour `id_categorie_club` ;
- `date_affiliation_club` pour `date_affiliation` ;
- anciennes variantes textuelles de sexe ou catégorie ;
- anciens identifiants provinciaux `PRO01` résolus vers la référence canonique correspondante.

Toute nouvelle écriture doit utiliser les en-têtes et identifiants canoniques.

## 14. Modèle Google Sheets

Le classeur logique est `structure`, configuré comme `01_FEBACO_STRUCTURE_TERRITORIALE`.

### 14.1 Feuille LIGUES

`id_ligue`, `nom_ligue`, `sigle_ligue`, `telephone`, `email`, `id_province`, `statut`, `observations`, `id_ligue_coc`, `date_creation`, `date_reconnaissance`.

### 14.2 Feuille ENTENTES

`id_entente`, `code_entente`, `nom_entente`, `sigle_entente`, `id_ligue`, `id_ville`, `email`, `statut`, `observations`, `id_entente_coc`, `date_creation`, `date_reconnaissance`, `telephone`.

### 14.3 Feuille CLUBS

`id_club`, `nom_club`, `id_categorie_club`, `id_sexe`, `date_affiliation`, `id_ville`, `id_entente`, `id_ligue_historique`, `telephone`, `statut`, `observations`, `id_club_coc`, `sigle_club`, `id_niveau_competitif_club`, `date_creation`, `email`.

Les colonnes média présentes dans le classeur sont conservées et gérées par le flux de logo.

### 14.4 Feuille EQUIPES

`id_equipe`, `nom_equipe`, `id_categorie_age`, `id_club`, `id_sexe`, `statut`, `observations`, `id_equipe_coc`, `id_discipline`.

### 14.5 Règles d’écriture

- la colonne est recherchée par son en-tête normalisé ;
- les colonnes non modifiées sont préservées ;
- une création écrit une seule ligne ;
- une modification cible exclusivement l’identifiant de route ;
- une colonne absente nécessaire à une valeur non vide produit `SCHEMA_INDISPONIBLE` ;
- un identifiant déjà présent produit `IDENTIFIANT_DUPLIQUE` ;
- aucune erreur brute de Google Sheets n’est exposée à l’utilisateur.

## 15. API

| Méthode | Route | Fonction | Autorisation |
| --- | --- | --- | --- |
| `GET` | `/api/ligues` | liste filtrée par périmètre | authentifié |
| `POST` | `/api/ligues` | création | fédéral |
| `PUT` | `/api/ligues/[id]` | modification | fédéral |
| `GET` | `/api/ententes` | liste filtrée | authentifié |
| `GET` | `/api/ententes/[id]` | fiche et clubs | authentifié dans le périmètre |
| `POST` | `/api/ententes` | création | fédéral |
| `PUT` | `/api/ententes/[id]` | modification | fédéral |
| `GET` | `/api/clubs` | liste enrichie | authentifié |
| `POST` | `/api/clubs` | création | fédéral |
| `PUT` | `/api/clubs/[id]` | modification | fédéral |
| `GET` | `/api/equipes` | liste enrichie et filtrable | authentifié |
| `POST` | `/api/equipes` | création | fédéral |
| `PUT` | `/api/equipes/[id]` | modification | fédéral |
| `GET` | `/api/structure-territoriale/referentiels` | options contrôlées | authentifié |
| `POST` | `/api/upload/club-logo` | logo du club | fédéral |

## 16. Validation et erreurs métier

### 16.1 Validations communes

- suppression des espaces en début et fin ;
- présence des champs obligatoires ;
- format valide de l’e-mail s’il est renseigné ;
- statut appartenant à la liste autorisée ;
- date de reconnaissance non antérieure à la création ;
- existence du parent direct ;
- existence de chaque identifiant de référentiel.

### 16.2 Principaux codes

| Code | Signification |
| --- | --- |
| `VALIDATION` | un ou plusieurs champs sont invalides |
| `PARENT_INTROUVABLE` | le parent sélectionné n’existe pas |
| `REFERENCE_INVALIDE` | valeur absente du référentiel |
| `REFERENTIEL_INDISPONIBLE` | lecture du référentiel impossible |
| `INTROUVABLE` | entité cible absente |
| `IDENTIFIANT_DUPLIQUE` | identifiant déjà présent |
| `RELATION_INCOHERENTE` | modification incompatible avec les descendants |
| `SCHEMA_INDISPONIBLE` | colonne physique nécessaire absente |
| `SERVICE_INDISPONIBLE` | écriture ou service externe indisponible |

## 17. Exigences d’interface

- présentation cohérente entre les quatre listes ;
- tableaux sur bureau et cartes compactes sur mobile ;
- absence de défilement horizontal imposé sur mobile ;
- statut affiché sous forme de badge ;
- identifiant visible mais secondaire par rapport au nom ;
- boutons d’ajout et modification visibles uniquement au fédéral ;
- sélecteurs pleine largeur dans les formulaires ;
- messages de chargement et d’erreur explicites ;
- bouton `Réessayer` après une panne de lecture ;
- confirmation visuelle après enregistrement ;
- logo de club avec alternative textuelle et initiales de secours ;
- liens directs vers les fiches des descendants.

## 18. Fiabilité et performance

- charger en parallèle les feuilles indépendantes ;
- réutiliser le cache de lecture Google Sheets ;
- relire la liste après une mutation pour restituer les libellés enrichis ;
- préserver les modifications utilisateur existantes dans les colonnes hors formulaire ;
- ne jamais écrire dans les feuilles réelles depuis les tests ;
- journaliser côté serveur une panne utile sans exposer de donnée sensible au client ;
- conserver une clé de rendu unique même lorsqu’une ancienne ligne ne possède pas d’identifiant exploitable.

## 19. Critères d’acceptation

Le bloc est accepté si :

1. la hiérarchie ne comporte que ligue, entente, club et équipe ;
2. une entité ne peut être créée avec un parent inexistant ;
3. seuls les parents directs sont enregistrés ;
4. les parents indirects affichés correspondent à la chaîne réelle ;
5. un utilisateur fédéral peut créer et modifier les quatre entités ;
6. les rôles ligue et entente restent en lecture seule ;
7. chaque rôle territorial ne voit que son périmètre ;
8. les identifiants sont générés côté serveur et ne sont pas modifiables ;
9. les champs obligatoires, e-mails, statuts, dates et référentiels sont contrôlés ;
10. une entente possédant des clubs ne peut pas changer de ligue ;
11. les listes proposent recherche, filtres, détail et rendu mobile ;
12. les fiches présentent correctement les enfants et affiliations disponibles ;
13. une création apparaît immédiatement avec ses libellés résolus ;
14. un logo valide apparaît immédiatement après téléversement ;
15. une erreur Sheets ne révèle aucun secret technique ;
16. aucune modification ne remplace les colonnes non concernées ;
17. les valeurs historiques restent lisibles tandis que les nouvelles écritures sont canoniques.

## 20. Scénarios de recette

### Scénario A — Création complète de la chaîne

Créer une ligue, puis une entente rattachée à cette ligue, un club rattaché à cette entente et une équipe rattachée à ce club. Vérifier sur chaque fiche la résolution de tous les parents.

### Scénario B — Contrôle du périmètre ligue

Se connecter comme utilisateur d’une ligue et vérifier que seules sa ligue, ses ententes, leurs clubs et leurs équipes sont visibles. Vérifier l’absence des boutons de création et modification.

### Scénario C — Contrôle du périmètre entente

Se connecter comme utilisateur d’une entente et vérifier la visibilité de sa ligue parente, de sa seule entente, de ses clubs et équipes. Toute écriture directe doit retourner `403`.

### Scénario D — Parent inexistant

Tenter de créer un club avec un identifiant d’entente absent. Vérifier le retour `422`, le message de champ et l’absence d’écriture.

### Scénario E — Entente avec descendants

Créer un club dans une entente puis tenter de changer la ligue de l’entente. Vérifier le retour `409 RELATION_INCOHERENTE`.

### Scénario F — Référentiel invalide

Tenter de créer une équipe avec une discipline, catégorie ou valeur de sexe inexistante. Vérifier que la référence est refusée côté serveur.

### Scénario G — Dates incohérentes

Saisir une date de reconnaissance antérieure à la date de création. Vérifier le blocage au niveau du champ.

### Scénario H — Logo d’un club

Créer un club, téléverser un fichier PNG conforme, vérifier son apparition dans la liste et la fiche, puis remplacer le fichier. Tester également un format interdit et un fichier supérieur à 5 Mo.

### Scénario I — Compatibilité historique

Lire une ancienne ligne utilisant un alias reconnu et vérifier son affichage. Modifier ensuite l’entité et vérifier que les en-têtes canoniques sont utilisés sans supprimer les colonnes historiques.

### Scénario J — Responsive

Sur petit écran, vérifier les quatre listes, l’ouverture du volet, les sélecteurs, les actions et l’accès aux fiches sans débordement horizontal.

## 21. Tests et contrôle qualité

Les tests automatisés doivent couvrir au minimum :

- génération des quatre familles d’identifiants ;
- validation des champs obligatoires ;
- rejet des e-mails et statuts invalides ;
- cohérence des dates ;
- contrôle des parents et référentiels ;
- interdiction du transfert incohérent d’une entente ;
- normalisation des anciennes valeurs d’affichage ;
- résolution immédiate des libellés après création ;
- tri alphabétique français ;
- relecture enrichie après mutation ;
- affichage immédiat du logo ;
- compilation des fiches détaillées ;
- authentification, rôle fédéral et scopes territoriaux.

Les validations finales comprennent les tests automatisés, le contrôle TypeScript et le build de production selon le niveau de modification.

## 22. Documentation de l’implémentation

Les responsabilités principales sont réparties comme suit :

- `lib/territorial.ts` : configuration, validation, identifiants, parents, référentiels et mutations ;
- `lib/territorial-client.ts` : sauvegarde, relecture, tri et fusion des médias ;
- `components/dashboard/territorial-manager.tsx` : listes et formulaire partagé ;
- `components/dashboard/territorial-detail.tsx` : fiche générique des ententes et équipes ;
- pages `[id]` des ligues, ententes, clubs et équipes : détails et descendants ;
- `app/api/_territorial-write.ts` : sécurité et normalisation des réponses d’écriture ;
- routes `/api/ligues`, `/api/ententes`, `/api/clubs`, `/api/equipes` : lectures enrichies et mutations ;
- `/api/structure-territoriale/referentiels` : listes contrôlées ;
- `/api/upload/club-logo` : gestion du logo.

---

**État du document :** description de référence de l’implémentation au 12 septembre 2026.
