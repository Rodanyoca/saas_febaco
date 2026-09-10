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
