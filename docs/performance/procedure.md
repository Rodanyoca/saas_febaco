# Procédure reproductible de mesure et validation

Référence initiale dc467a6 ; ne pas confondre une procédure à effectuer avec une preuve déjà acquise. Toutes les nouvelles observations doivent être ajoutées à [mesures](mesures.md), en conservant les historiques.

## 1. Préparer et identifier

1. Lire ce canevas, README et tout AGENTS.md applicable. Vérifier git status sans afficher de secrets. Créer une branche/worktree depuis le SHA réellement publié, sans réinitialiser le workspace principal.
2. Lire alias et métadonnées Vercel : équipe/projet, SHA, deployment ID, région, état, URL et heure UTC. Conserver le déploiement précédent. Relever tout changement local et tout code publié depuis la baseline.
3. Relever Node/ICU, versions dépendances, nombre de scénarios, OS et charge concurrente. Les variables sont vérifiées par présence seulement ; ne pas imprimer leurs valeurs. Ne pas copier .env dans un rapport ou dans Git.
4. Pour chaque mesure, enregistrer source, UTC/Paris, bornes exactes, environnement, route/méthode, liste/fiche, cache chaud/froid, critères et limites. Distinguer observations réelles, mocks et données synthétiques.

## 2. Diagnostic local sans Google

Depuis la racine du worktree, avec dépendances déjà installées et commandes en PowerShell :

```powershell
npx.cmd tsx scripts/diagnose-affiliation-processing.ts > mesure-affiliations-locale.json
npx.cmd tsx --test tests/affiliations.test.ts tests/licences.test.ts tests/territorial.test.ts tests/auth/guard.test.ts tests/auth/security.test.ts tests/athletes-table-api.test.ts tests/athletes-table-ui.test.ts tests/sheets-quota.test.ts tests/athlete-sort.test.ts tests/athlete-detail-category.test.ts
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm.cmd run typecheck
```

Le diagnostic interdit les écritures injectées et ne charge pas les .env. Il affiche uniquement agrégats et métadonnées techniques. Ne pas lancer d'autres requêtes dans le même processus pendant les mesures CPU. Conserver les échantillons, pas seulement une moyenne. Pour un futur correctif : exécuter baseline et variante sur exactement les mêmes données, alternance de l'ordre par paire après échauffement, ≥9 passages ; comparer réponses/statuts avant toute conclusion de vitesse. Les marqueurs instrumentant les transformations servent à des tests séparés, pas au benchmark chronométré.

Scénarios complémentaires à préparer pour P1 : aucune affiliation ; un match ; plusieurs matchs ; doublons même ID/date ; nom vide/accents ; inconnu/non autorisé ; acteurs ou équipes manquants/anomalies ; filtres directs et dérivés combinés ; création idempotente et modification ; 6k/14k/28k lignes. Préserver les chaînes, la casse des critères, les ordres stables et les erreurs. Une lecture complète de feuille peut toujours rester nécessaire.

Autres diagnostics existants : `scripts/benchmark-athlete-sort.ts` (sans --sheets), `scripts/benchmark-athlete-detail.ts`, `scripts/measure-athlete-table-response.ts` (mode synthétique). Ne pas employer les options de lecture réelle simplement pour obtenir un chiffre ; si une lecture de données réelles est nécessaire, garder les lignes en mémoire et n'enregistrer que les octets/counts, jamais les corps.

### Reproduire P1, sans instrumentation chronométrée

```powershell
npx.cmd tsx --test tests/affiliations-p1.test.ts tests/affiliations.test.ts tests/territorial.test.ts tests/auth/guard.test.ts tests/auth/security.test.ts
npx.cmd tsx scripts/benchmark-affiliations-p1.ts docs/performance/mesures-p1-nouvelle-session.json
```

La baseline `tests/fixtures/affiliations-before-p1.ts` doit rester figée au blob dc467a6, pas remplacée par la variante. Le helper `affiliationModule(before, probes)` injecte un compteur dans le callback d'enrichissement seulement si probes=true ; les tests utilisent true, le benchmark utilise false. Le script écrit directement en UTF-8 et vérifie l'équivalence avant/après à chaque paire, l'enveloppe et le nombre de lectures. Ne pas lancer tests/build dans le même processus de mesure ; pour éviter la contention de la machine, le benchmark a été terminé avant leur lancement.

Conserver tous les passages et le contrôle sans filtre, y compris une dégradation ou un gain faible. Écrire une nouvelle mesure plutôt qu'écraser l'historique. Consigner le hash des sources, le SHA de base et le commit candidat dans le bilan Git. Le gain de confirmation après mutation ne doit pas être déduit comme gain total de mutation : mesurer ce dernier séparément si nécessaire, uniquement sur fixture/staging autorisé. Aucun test d'écriture en production.

Après modification applicative ultérieure : tests ciblés puis TypeScript et build de production. Les types `.next` périmés après suppression de routes doivent être régénérés ; ne pas masquer les erreurs du code. Build avec heap 4 Go a déjà été nécessaire sur la machine ; ce n'est pas une configuration mémoire Vercel ni une mesure de requête.

## 3. Parcours manuel authentifié (non réalisé ici)

Utiliser une session existante réellement autorisée. Ne jamais extraire/publier son cookie, token, compte ou données personnelles. Pas de création métier en production ni de charge sans instruction explicite ; réserver la mutation à une fixture locale/staging autorisée.

1. Ouvrir DevTools Network, Preserve log et colonne Initiator ; distinguer `/api/…`, document, RSC, media et middleware. Relever anonymement le navigateur, viewport, SHA et heure. Ne pas sauvegarder un HAR brut dans Git.
2. Ouvrir une seule fois la liste. Relever GET table, currentSeason, count, ordre, champs allowlist, octets bruts et transferSize/compression lorsqu'accessibles. Les mesures DevTools peuvent différer du JSON local.
3. Chercher, filtrer sexe/statut, trier nom/licence asc/desc, changer page/pageSize et scroller. Vérifier absence de GET métier déclenché par ces seules actions. Relever état exact avant ouverture fiche.
4. Ouvrir une fiche ; relever GET id complet et GET historique licences anticipé. Vérifier nom/catégorie/photo et refus pour ID inconnu ou hors périmètre (ne pas copier ID réel dans le rapport).
5. Ouvrir Affiliations : relever histoire, auth/me et référentiels, options réellement utilisées. Changer plusieurs fois d'onglet, puis ouvrir/fermer le formulaire sans soumettre ; compter les requêtes par action/initiator. Les animations Radix peuvent différer le démontage.
6. Sur environnement autorisé seulement, créer/modifier une affiliation ; vérifier une commande, erreurs/anti-double-submit, réponse confirmée, ligne immédiatement affichée et absence de GET client de succès non prévu. Vérifier l'éligibilité licence dépendante après changement d'équipe/période.
7. Retour via bouton de fiche puis via historique navigateur ; relever recherche, filtres, tri, page, scroll et nombre de GET table. Ouvrir athlète suivant. Refaire en viewport mobile ; pas d'hypothèse sur conservation useState par le router.
8. Changer d'onglet navigateur puis revenir, focus/visibilité, avant et après TTL. Distinguer events proches et mises à jour regroupées. Un abort client ne garantit pas l'absence de travail serveur.
9. Tester saison changée dans un autre onglet, édition identité/photo, licence nouvelle/modifiée, rattachement territorial, logout/revocation. Aucun client ne doit afficher silencieusement une liste d'une session précédente.

## 4. Matrice de permissions et fraîcheur

| Cas | Attendu / preuve à collecter |
|---|---|
| Sans session, cookie invalide/expiré | GET/POST/PUT refusés ; redirection des pages vers login ; aucun payload métier |
| Session révoquée/version changée ou utilisateur inactif | refus après vérification annuaire, sans stale fallback de droits ; tester après borne TTL existante et instance différente |
| Activation requise ou grant absent/expiré | 403 ; erreur source de droits →503, pas élargissement de périmètre |
| Fédéral READ / VIEWER | consultation autorisée selon grant, WRITE refusé si type/droit interdit |
| Fédéral WRITE | mutation valide confirmée ; conflit/erreur d'origine/panne Sheets conservés |
| Ligue L1 / entente E1 et E2 | uniquement acteurs/affiliations/équipes/licences de leurs périmètres ; acteur avec affiliations croisées ne révèle pas celles hors scope |
| Autre ligue et inconnus | aucun résultat métier hors scope ; comportement 200 vide/404 existant conservé selon route |
| Après affiliation/structure/saison modifiée | index de scope et projections cohérents ; aucune réutilisation d'un résultat fédéral ou ancien scope |

Tests existants guard/territorial/table API utilisent sources simulées et fonctions réelles ; ils ne remplacent pas cette matrice avec sessions réelles et déploiement courant. Ajouter des tests de course si un cache est modifié : lecture en cours au moment d'une écriture, invalidation puis résolution ancienne, autre instance, panne et quota.

## 5. Observabilité accessible

```powershell
vercel.cmd --scope team_f8eup9TubcHKCbP7dlKhD4sz logs requests --project prj_70Yn4KFh95KltHa5xuSB0jUVwNA6 --deployment DEPLOYMENT_ID --since 5m --limit 100 --json --non-interactive
vercel.cmd --scope team_f8eup9TubcHKCbP7dlKhD4sz logs runtime --project prj_70Yn4KFh95KltHa5xuSB0jUVwNA6 --deployment DEPLOYMENT_ID --query 'level:error OR level:fatal' --since 5m --limit 20 --json --non-interactive
```

Remplacer DEPLOYMENT_ID par la référence vérifiée. Rediriger les enregistrements dans un fichier temporaire local, puis agréger seulement route normalisée sans identifiants, méthode, statut, nombre, fenêtre et pagination. Ne pas publier les messages bruts potentiellement sensibles. Une limite atteinte ou rétention partielle doit être signalée. Une fenêtre vide n'établit aucune absence d'erreur hors fenêtre. Le CLI 64.5.0 utilise `--query`, pas l'ancien `--level` ; ne pas essayer la même commande incompatible en boucle.

Demander éventuellement les captures accessibles à l'utilisateur avec bornes/versions/environnement/mix de trafic ; **aucune répétition des requêtes CPU exigeant Observability Plus**, aucun achat ou changement d'offre. [Vercel Fluid compute pricing](https://vercel.com/docs/functions/usage-and-pricing) distingue CPU actif, mémoire et invocations : l'attente I/O n'est pas le CPU actif. Ne pas attribuer process.cpuUsage d'un processus concurrent à une seule requête ; séparer lignes de logs, requêtes HTTP et compteur facturé.

## 6. Décision, livraison et reprise

Pour chaque intervention, mettre à jour le tableau d'état du canevas : proposée → implémentée → vérifiée localement → publiée → observée en production, sans sauter de statut. Noter SHA/diff/test/mesure/limites et référence rollback. Pas de publication dans cet audit. Plus tard, ne publier qu'un diff autorisé, conserver les évolutions parallèles et revérifier alias/SHA ; un push main déclenche Vercel automatiquement.
