# Rapport d’implémentation — acteurs FEBACO

Date : 10 septembre 2026

## Livré

- Création par `POST /api/athletes`, `/api/coachs`, `/api/officiels`, `/api/arbitres`, `/api/medecins` et `/api/autres`.
- Modification par `PUT /api/{catégorie}/[id]` pour les six catégories.
- Session et rôle `federal` contrôlés côté serveur ; actions masquées aux autres rôles.
- Module commun de validation, normalisation, génération d’identifiants, référentiels, unicité, écriture unique puis relecture.
- Volet `ActorEditor` partagé avec erreurs par champ, verrou anti-double soumission et mise à jour locale depuis la réponse.
- Liste, fiche et navigation ajoutées pour `AUTRES`; actions intégrées aux cinq interfaces existantes.

## Règles et compatibilité

Le nom complet, le sexe et le statut sont obligatoires. Les écritures utilisent `ACTIF`/`INACTIF` et `SEX001`/`SEX002`/`SEX099`. L’identifiant principal est serveur et immuable. Les identifiants national et international non vides sont uniques par catégorie. Courriel, naissance et dates de passeport sont validés. Un PUT préserve les champs omis.

La lecture accepte les sexes historiques, `date_naissance`, `id_fiba`, `id_fifa` et `id_bwf`. La génération reprend la convention observée (identifiants numériques des coachs, préfixe `REF` des arbitres) et utilise sinon `ATH`, `COA`, `OFF`, `ARB`, `MED`, `AUT` sur cinq chiffres. Aucun rapprochement par nom n’est effectué.

## Vérifications

- Lecture seule des six en-têtes Acteurs et des trois référentiels.
- Tests automatisés dédiés aux acteurs et tests existants réussis; aucune écriture vers Sheets.
- TypeScript réussi pendant l’implémentation; les contrôles finaux sont consignés lors de la livraison.

## Limites

- `SPECIALITES_MEDECINS` est vide : les mutations de médecins sont bloquées avec une anomalie explicite.
- Plusieurs feuilles n’ont pas encore toutes les colonnes du modèle commun, notamment `observations`; `AUTRES` est particulièrement incomplet. Une valeur visant une colonne absente est refusée pour éviter toute perte silencieuse.
- L’avatar réutilise le mécanisme existant après création. Aucun téléversement de passeport n’existe dans le dépôt, donc aucun second système média n’a été créé.
