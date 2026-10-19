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

## 7. Livraison combinée P1 et fonctionnel (autorisation du 19 octobre 2026)

L'autorisation actuelle couvre l'intégration, les commits, le push et le déploiement de l'ensemble applicatif/documentaire voulu. Elle remplace la restriction historique « P1 isolé sans publication ». Aucun développement supplémentaire Compétitions n'est ajouté pour cette livraison.

- Intégrer depuis la production vérifiée les commits P1 et la documentation, puis les changements identification/Compétitions existants. Préserver les implémentations publiées de tri, chemin individuel et projection, ainsi que les évolutions acteurs/licences/saison et dashboard.
- Inventorier les fichiers suivis et non suivis des worktrees ; exclure secrets, données personnelles, fichiers d'environnement contenant des valeurs, scripts d'administration locaux, réglages d'éditeur, caches et sorties de build. Vérifier le diff final avant push, sans force push.
- Vérifier tests complets/ciblés, TypeScript et build. Reproduire les échecs Ligue/Club sur la base publiée pour les distinguer des régressions.
- Pousser le commit d'intégration vers `main` après les contrôles : l'intégration Git Vercel déclenche la production. Vérifier l'alias, le SHA et l'état READY, puis conserver les métadonnées de publication et le déploiement précédent dans le canevas.
- Sans session : vérifier login, redirection dashboard et refus API (liste complète/projetée, fiche et affiliations). Ne pas fabriquer de cookie ni effectuer d'écriture métier pour cette vérification.
- Avec une session existante : vérifier ordinateur/mobile, recherche exacte/partielle par ID système, absence d'ID visible, licence/nom, filtres, tri, pagination, photos et ouverture de fiche ; vérifier les réponses complète et individuelle (même avec view=table), identifiant inconnu, affiliations ciblées et périmètres fédéral/ligue/entente. Sans session, conserver cette liste de contrôles manuels restants ; les fixtures ne sont pas une validation authentifiée de production.
- Consulter les erreurs runtime accessibles sur une fenêtre UTC bornée sans divulguer de messages bruts ou données métier. Aucune nouvelle tentative Observability Plus. Les observations de cette livraison combinée ne mesurent pas le gain CPU isolé de P1.

## 8. Validation P2 locale, sans publication

Base : production vérifiée 42f6db2. Worktree `perf/athlete-licences-on-demand`. Baseline du service figée dans `tests/fixtures/licences-before-p2.ts`, blob égal à `git rev-parse 42f6db2:lib/licences.ts` via `git hash-object --path=lib/licences.ts`.

Commandes :

```powershell
npx.cmd tsx --test tests/licences-p2.test.ts tests/athlete-licence-lazy.test.ts tests/licences.test.ts
npm.cmd test
npm.cmd run typecheck
npm.cmd run build -- --webpack
npx.cmd tsx scripts/benchmark-licences-p2.ts docs/performance/mesures-p2-2026-10-19.json
```

Comparer exactement JSON, ordre, doublons, données manquantes, affiliations croisées et périmètres fédéral/ligue/entente ; ID inconnu/non autorisé, trim/casse, absence de paramètre, refus de session/droits et panne source sans court-circuit. Vérifier aussi liste globale, filtres, synthèses/références et mutations existantes. Les probes de vues/synthèses sont seulement injectées dans les tests, absentes du benchmark et de l'application.

Client : SSR réel Radix pour montage initial/onglets ; harnais d'effets pour réouverture, ID stable après édition/photo, erreur/retry, changement d'athlète et réponses tardives annulées. Le navigateur authentifié reste une validation distincte : ouvrir Général/Affiliations sans GET historique, puis Licence, quitter/revenir, changer d'athlète, éditer/photo, simuler une erreur ; vérifier tableau et absence de données périmées. Ne pas prétendre que ce harnais mesure le trafic de production.

Benchmark : mêmes objets synthétiques convertis, 6k/14k/28k licences, 26 199 acteurs, 100 équipes ; trois échauffements puis neuf paires alternées, CPU processus et durée écoulée séparés, 10 appels par échantillon ciblé/ID inconnu et 3 pour contrôle global. Dix lectures logiques conservées ; JSON individuel identique. Conserver résultats défavorables et limites des compteurs Windows, GC et charge des autres processus. Aucun Google, cookie ou écriture métier. Rétablir séparément le client ou la route/service depuis la base si nécessaire ; aucune publication automatique dans cette étape.

Précision du protocole final P2 : le premier prototype conserve 3 appels par échantillon global dans son JSON. La variante finale conserve 10 appels pour cible/ID inconnu et utilise 1 appel global par échantillon (durée déjà supérieure à la résolution CPU), après la fin du build et des tests locaux. Les neuf paires alternées et trois échauffements restent identiques ; comparer chaque avant/après dans son propre protocole, pas les deux contrôles globaux comme une amélioration attribuable au code.
