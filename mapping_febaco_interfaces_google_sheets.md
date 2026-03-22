# Mapping technique FECOBACO — Google Sheets → Interfaces Next.js

Ce document fige le mapping entre le tableur `DATABASE_FEBACO.xlsx` et les interfaces V1.

## Règles générales

- L’application est en **lecture seule**.
- Le tableur est la **source officielle**.
- Les noms de feuilles Google Sheets doivent rester exactement les mêmes.
- Les noms de colonnes doivent rester stables pour éviter de casser le mapping.
- Les routes/pages UI consomment un format objet JavaScript plus simple que les noms de colonnes du tableur.
- Les champs de détail non présents dans certaines cartes peuvent rester disponibles pour les futures évolutions.

## Feuilles actives V1

- provinces
- ligues
- ententes
- clubs
- equipes
- athletes
- coachs
- officiels
- medecins
- arbitres

---

## 1) provinces

### Colonnes du tableur
- `id_province`
- `nom_province`

### Mapping UI conseillé
- `id_province` → `id`
- `nom_province` → `nom`

### Usage interface
- listes de référence
- filtres hiérarchiques
- affichage dashboard

### Remarque
Cette feuille sert surtout de référentiel de base et d’alimentation des filtres.

---

## 2) ligues

### Colonnes du tableur
- `id_ligue`
- `nom_ligue`
- `pseudo_ligue`
- `id_province`
- `nom_province`
- `statut`

### Mapping UI conseillé
- `id_ligue` → `id`
- `nom_ligue` → `nom`
- `pseudo_ligue` → `pseudo`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `statut` → `statut`

### Usage interface
- page `/ligues`
- tableau liste
- filtres par province
- compteurs dashboard

---

## 3) ententes

### Colonnes du tableur
- `id_entente`
- `nom_entente`
- `pseudo_entente`
- `id_ligue`
- `nom_ligue`
- `id_province`
- `nom_province`
- `statut`

### Mapping UI conseillé
- `id_entente` → `id`
- `nom_entente` → `nom`
- `pseudo_entente` → `pseudo`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `statut` → `statut`

### Usage interface
- page `/ententes`
- tableau liste
- filtres province / ligue
- compteurs dashboard

---

## 4) clubs

### Colonnes du tableur
- `id_club`
- `nom_club`
- `categorie`
- `section`
- `id_entente`
- `nom_entente`
- `id_ligue`
- `nom_ligue`
- `id_province`
- `nom_province`
- `observation`
- `statut`

### Mapping UI conseillé
- `id_club` → `id`
- `nom_club` → `nom`
- `categorie` → `categorie`
- `section` → `section`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `observation` → `observation`
- `statut` → `statut`

### Champs calculés côté application
- `nombreEquipes` = nombre de lignes dans `equipes` ayant `id_club` identique
- `nombreAthletes` = nombre de lignes dans `athletes` ayant `id_club` identique

### Usage interface
- page `/clubs`
- page `/clubs/[id]`
- filtres province / ligue / entente / catégorie / statut
- fiche PDF club

---

## 5) equipes

### Colonnes du tableur
- `id_equipe`
- `nom_equipe`
- `id_club`
- `nom_club`
- `id_entente`
- `nom_entente`
- `id_ligue`
- `nom_ligue`
- `id_province`
- `nom_province`
- `categorie`
- `genre`
- `id_coach`
- `nom_coach`
- `statut`

### Mapping UI conseillé
- `id_equipe` → `id`
- `nom_equipe` → `nom`
- `id_club` → `clubId`
- `nom_club` → `club`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `categorie` → `categorie`
- `genre` → `genre`
- `id_coach` → `coachId`
- `nom_coach` → `coach`
- `statut` → `statut`

### Usage interface
- source secondaire des fiches club
- source des filtres pour athletes et coachs
- future page équipes si activée

---

## 6) athletes

### Colonnes du tableur
- `id_athlete`
- `nom_complet`
- `date_de_naissance`
- `lieu_de_naissance`
- `sexe`
- `nationalite`
- `taille`
- `poids`
- `categorie`
- `id_province`
- `nom_province`
- `id_ligue`
- `nom_ligue`
- `pseudo_ligue`
- `id_entente`
- `nom_entente`
- `pseudo_entente`
- `id_club`
- `nom_club`
- `id_equipe`
- `nom_equipe`
- `numero_maillot`
- `poste`
- `statut`
- `observation`

### Mapping UI conseillé
- `id_athlete` → `id`
- `nom_complet` → `nom`
- `date_de_naissance` → `dateNaissance`
- `lieu_de_naissance` → `lieuNaissance`
- `sexe` → `sexe`
- `nationalite` → `nationalite`
- `taille` → `taille`
- `poids` → `poids`
- `categorie` → `categorie`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `pseudo_ligue` → `pseudoLigue`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `pseudo_entente` → `pseudoEntente`
- `id_club` → `clubId`
- `nom_club` → `club`
- `id_equipe` → `equipeId`
- `nom_equipe` → `equipe`
- `numero_maillot` → `numeroMaillot`
- `poste` → `poste`
- `statut` → `statut`
- `observation` → `observation`

### Usage interface
- page `/athletes`
- page `/athletes/[id]`
- recherche globale
- filtres province / ligue / entente / club / équipe / sexe / catégorie / statut
- fiche PDF athlète

### Remarque
`nom_complet` doit rester le champ de référence d’affichage.

---

## 7) coachs

### Colonnes du tableur
- `id_coach`
- `nom_complet`
- `sexe`
- `date_de_naissance`
- `niveau`
- `specialite`
- `nationalite`
- `id_province`
- `nom_province`
- `id_ligue`
- `nom_ligue`
- `pseudo_ligue`
- `id_entente`
- `nom_entente`
- `pseudo_entente`
- `id_club`
- `nom_club`
- `id_equipe`
- `nom_equipe`
- `telephone`
- `email`
- `statut`
- `observation`

### Mapping UI conseillé
- `id_coach` → `id`
- `nom_complet` → `nom`
- `sexe` → `sexe`
- `date_de_naissance` → `dateNaissance`
- `niveau` → `niveau`
- `specialite` → `specialite`
- `nationalite` → `nationalite`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `pseudo_ligue` → `pseudoLigue`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `pseudo_entente` → `pseudoEntente`
- `id_club` → `clubId`
- `nom_club` → `club`
- `id_equipe` → `equipeId`
- `nom_equipe` → `equipe`
- `telephone` → `telephone`
- `email` → `email`
- `statut` → `statut`
- `observation` → `observation`

### Usage interface
- page `/coachs`
- page `/coachs/[id]`
- filtres province / ligue / entente / club / équipe / niveau / statut
- fiche PDF coach

---

## 8) officiels

### Colonnes du tableur
- `id_officiel`
- `nom_complet`
- `sexe`
- `date_de_naissance`
- `fonction`
- `nationalite`
- `id_province`
- `nom_province`
- `structure`
- `id_ligue`
- `nom_ligue`
- `pseudo_ligue`
- `id_entente`
- `nom_entente`
- `pseudo_entente`
- `id_club`
- `nom_club`
- `telephone`
- `email`
- `statut`
- `observation`

### Mapping UI conseillé
- `id_officiel` → `id`
- `nom_complet` → `nom`
- `sexe` → `sexe`
- `date_de_naissance` → `dateNaissance`
- `fonction` → `fonction`
- `nationalite` → `nationalite`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `structure` → `structure`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `pseudo_ligue` → `pseudoLigue`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `pseudo_entente` → `pseudoEntente`
- `id_club` → `clubId`
- `nom_club` → `club`
- `telephone` → `telephone`
- `email` → `email`
- `statut` → `statut`
- `observation` → `observation`

### Usage interface
- page `/officiels`
- page `/officiels/[id]`
- filtres province / ligue / entente / club / fonction / statut
- fiche PDF officiel

---

## 9) medecins

### Colonnes du tableur
- `id_medecin`
- `nom_complet`
- `sexe`
- `date_de_naissance`
- `nationalite`
- `specialite`
- `structure_medicale`
- `id_province`
- `nom_province`
- `id_ligue`
- `nom_ligue`
- `pseudo_ligue`
- `id_entente`
- `nom_entente`
- `pseudo_entente`
- `id_club`
- `nom_club`
- `id_equipe`
- `nom_equipe`
- `telephone`
- `email`
- `statut`
- `observation`

### Mapping UI conseillé
- `id_medecin` → `id`
- `nom_complet` → `nom`
- `sexe` → `sexe`
- `date_de_naissance` → `dateNaissance`
- `nationalite` → `nationalite`
- `specialite` → `specialite`
- `structure_medicale` → `structureMedicale`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `pseudo_ligue` → `pseudoLigue`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `pseudo_entente` → `pseudoEntente`
- `id_club` → `clubId`
- `nom_club` → `club`
- `id_equipe` → `equipeId`
- `nom_equipe` → `equipe`
- `telephone` → `telephone`
- `email` → `email`
- `statut` → `statut`
- `observation` → `observation`

### Usage interface
- page `/medecins`
- page `/medecins/[id]`
- filtres province / ligue / entente / club / spécialité / statut
- fiche PDF médecin

---

## 10) arbitres

### Colonnes du tableur
- `id_arbitre`
- `nom_complet`
- `sexe`
- `date_de_naissance`
- `nationalite`
- `niveau`
- `id_province`
- `nom_province`
- `id_ligue`
- `nom_ligue`
- `pseudo_ligue`
- `id_entente`
- `nom_entente`
- `pseudo_entente`
- `telephone`
- `email`
- `statut`
- `observation`

### Mapping UI conseillé
- `id_arbitre` → `id`
- `nom_complet` → `nom`
- `sexe` → `sexe`
- `date_de_naissance` → `dateNaissance`
- `nationalite` → `nationalite`
- `niveau` → `niveau`
- `id_province` → `provinceId`
- `nom_province` → `province`
- `id_ligue` → `ligueId`
- `nom_ligue` → `ligue`
- `pseudo_ligue` → `pseudoLigue`
- `id_entente` → `ententeId`
- `nom_entente` → `entente`
- `pseudo_entente` → `pseudoEntente`
- `telephone` → `telephone`
- `email` → `email`
- `statut` → `statut`
- `observation` → `observation`

### Usage interface
- page `/arbitres`
- page `/arbitres/[id]`
- filtres province / ligue / entente / niveau / statut
- fiche PDF arbitre

---

## Objets UI minimaux recommandés

### Ligue
- id
- nom
- pseudo
- provinceId
- province
- statut

### Entente
- id
- nom
- pseudo
- ligueId
- ligue
- provinceId
- province
- statut

### Club
- id
- nom
- categorie
- section
- ententeId
- entente
- ligueId
- ligue
- provinceId
- province
- observation
- statut
- nombreEquipes
- nombreAthletes

### Équipe
- id
- nom
- clubId
- club
- ententeId
- entente
- ligueId
- ligue
- provinceId
- province
- categorie
- genre
- coachId
- coach
- statut

### Athlète
- id
- nom
- dateNaissance
- lieuNaissance
- sexe
- nationalite
- taille
- poids
- categorie
- provinceId
- province
- ligueId
- ligue
- pseudoLigue
- ententeId
- entente
- pseudoEntente
- clubId
- club
- equipeId
- equipe
- numeroMaillot
- poste
- statut
- observation

### Coach
- id
- nom
- sexe
- dateNaissance
- niveau
- specialite
- nationalite
- provinceId
- province
- ligueId
- ligue
- pseudoLigue
- ententeId
- entente
- pseudoEntente
- clubId
- club
- equipeId
- equipe
- telephone
- email
- statut
- observation

### Officiel
- id
- nom
- sexe
- dateNaissance
- fonction
- nationalite
- provinceId
- province
- structure
- ligueId
- ligue
- pseudoLigue
- ententeId
- entente
- pseudoEntente
- clubId
- club
- telephone
- email
- statut
- observation

### Médecin
- id
- nom
- sexe
- dateNaissance
- nationalite
- specialite
- structureMedicale
- provinceId
- province
- ligueId
- ligue
- pseudoLigue
- ententeId
- entente
- pseudoEntente
- clubId
- club
- equipeId
- equipe
- telephone
- email
- statut
- observation

### Arbitre
- id
- nom
- sexe
- dateNaissance
- nationalite
- niveau
- provinceId
- province
- ligueId
- ligue
- pseudoLigue
- ententeId
- entente
- pseudoEntente
- telephone
- email
- statut
- observation

---

## Ordre de branchement recommandé

1. provinces
2. ligues
3. ententes
4. clubs
5. equipes
6. athletes
7. coachs
8. arbitres
9. officiels
10. medecins

---

## Décision technique validée

- Le système lit seulement Google Sheets.
- Il n’écrit pas dans les feuilles.
- Les compteurs dérivés sont calculés côté application.
- Windsurf peut être utilisé après :
  - création du projet Google Cloud
  - activation de l’API Google Sheets
  - création du service account
  - partage du tableur avec le service account
  - ajout des variables d’environnement dans le projet
