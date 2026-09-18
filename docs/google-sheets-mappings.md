# Mappings Google Sheets

## Acteurs FEBACO

Classeur configuré : `03_FEBACO_ACTEURS`. Le mapping logique commun est `id_[acteur]`, `id_national`, `id_international`, `nom_complet`, `id_sexe`, `date_de_naissance`, `lieu_de_naissance`, `nationalite`, les coordonnées, les champs passeport, `statut`, les médias et `observations`. `MEDECINS` ajoute `id_specialite_sante` et `AUTRES`, `id_type_autre_acteur`.

En-têtes et référentiels vérifiés en lecture seule le 10 septembre 2026 :

| Feuille | Alias physiques historiques |
| --- | --- |
| `ATHLETES`, `COACHS`, `OFFICIELS` | `id_fiba` → `id_international`, `date_naissance` → `date_de_naissance` |
| `ARBITRES` | `id_fifa` → `id_international`, `date_naissance` → `date_de_naissance` |
| `MEDECINS` | `id_bwf` → `id_international`, `id_specialite` → `id_specialite_sante` |
| `AUTRES` | `type_autre_acteur` → `id_type_autre_acteur` |

`SEXES` contient `SEX001`, `SEX002`, `SEX099`; `TYPES_AUTRES_ACTEURS` contient `TAU001`, `TAU099`; `SPECIALITES_MEDECINS` est vide. `date_affiliation`, les niveaux et grades historiques ne sont jamais écrits par les formulaires Acteurs. Une colonne logique absente produit une erreur explicite si une valeur non vide doit y être enregistrée ; l’application ne modifie pas les en-têtes.

## Structure territoriale FEBACO

Classeur configuré : `01_FEBACO_STRUCTURE_TERRITORIALE`.

### Mappings physiques cibles

| Feuille | Colonnes, dans l'ordre |
| --- | --- |
| `LIGUES` | `id_ligue`, `nom_ligue`, `sigle_ligue`, `telephone`, `email`, `id_province`, `statut`, `observations`, `id_ligue_coc`, `date_creation`, `date_reconnaissance` |
| `ENTENTES` | `id_entente`, `code_entente`, `nom_entente`, `sigle_entente`, `id_ligue`, `id_ville`, `email`, `statut`, `observations`, `id_entente_coc`, `date_creation`, `date_reconnaissance`, `telephone` |
| `CLUBS` | `id_club`, `nom_club`, `id_categorie_club`, `id_sexe`, `date_affiliation`, `id_ville`, `id_entente`, `id_ligue_historique`, `telephone`, `statut`, `observations`, `id_club_coc`, `sigle_club`, `id_niveau_competitif_club`, `date_creation`, `email` |
| `EQUIPES` | `id_equipe`, `nom_equipe`, `id_categorie_age`, `id_club`, `id_sexe`, `statut`, `observations`, `id_equipe_coc` |

### Référentiels

| Champ | Feuille | Stockage |
| --- | --- | --- |
| `id_province` | `PROVINCES` | Identifiant uniquement |
| `id_ville` | `VILLES` | Identifiant uniquement |
| `id_categorie_club` | `CATEGORIES_CLUB` | Identifiant uniquement |
| `id_niveau_competitif_club` | `NIVEAUX_COMPETITIFS_CLUB` | Identifiant uniquement |
| `id_categorie_age` | `CATEGORIES_AGE` | Identifiant uniquement |
| `id_sexe` | `SEXES` | Identifiant uniquement |

Les libellés sont résolus à la lecture. Les parents indirects ne sont pas stockés.

### État du classeur au 9 septembre 2026

Les en-têtes ont été normalisés et correspondent aux mappings physiques ci-dessus. `id_ligue_historique` est conservé pour les anciennes lignes de clubs mais n'est jamais utilisé comme parent courant ni alimenté à la création.

L'écriture recherche chaque colonne par son en-tête normalisé et préserve les colonnes non modifiées.
## Affiliations FEBACO

Classeur configuré : `03_FEBACO_AFFILIATIONS`.

| Feuille | Colonnes, dans l'ordre |
| --- | --- |
| `ATHLETE_AFFILIATIONS` | `id_affiliation_athlete`, `id_athlete`, `id_equipe`, `date_debut`, `date_fin`, `id_statut_affiliation`, `observation` |
| `COACH_AFFILIATIONS` | `id_affiliation_coach`, `id_coach`, `id_equipe`, `id_fonction`, `date_debut`, `date_fin`, `id_statut_affiliation`, `observation` |
| `MEDECINS_AFFILIATIONS` | `id_affiliation_medecin`, `id_medecin`, `id_equipe`, `date_debut`, `date_fin`, `id_statut_affiliation`, `observation` |
| `OFFICIELS_AFFILIATIONS` | `id_affiliation_officiel`, `id_officiel`, `id_fonction`, `id_type_entite`, `id_entite`, `date_debut`, `date_fin`, `id_statut_affiliation`, `observation` |
| `AUTRES_AFFILIATIONS` | `id_affiliation_autre`, `id_autre_acteur`, `entite`, `date_debut`, `date_fin`, `id_statut_affiliation`, `observation` |

L'identité de l'acteur et les libellés des équipes, clubs, fonctions et entités ne sont pas dupliqués. Pour un athlète, coach ou médecin, le chemin unique est `acteur → id_equipe → id_club`; les libellés sont résolus seulement après ces jointures. Les fonctions de coach autorisées sont `FON005`, `FON006` et `FON099`. Les officiels utilisent `STR000`, `STR001`, `STR002`, `STR003` ou `STR099`. La période est définie uniquement par `date_debut` et `date_fin`, cette dernière pouvant rester vide. Les arbitres n'ont aucune feuille d'affiliation : `date_affiliation` reste uniquement dans `ARBITRES`.

Les identifiants générés sont respectivement `AFA-000001`, `AFC-000001`, `AFM-000001`, `AFO-000001` et `AFAUT-000001`. Les statuts viennent de `STATUTS_AFFILIATION` et les cinq relations autorisées de `TYPES_AFFILIATION`.
