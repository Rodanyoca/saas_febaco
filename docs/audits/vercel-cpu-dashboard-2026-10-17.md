# Audit CPU Vercel FEBACO — déclenchement de `/api/dashboard`

Date : 17 octobre 2026. Tous les horodatages des mesures ci-dessous sont en UTC.

## Conclusion actuelle

Le commit étudié ne contient aucun mécanisme explicite provoquant deux GET `/api/dashboard` lors d'un montage unique en production. Le CSV montre cependant deux requêtes distinctes, rapprochées, accompagnées de deux séquences `/login` → `/dashboard`. Leur initiateur navigateur et leur lien avec un même montage restent inconnus.

Le cache des valeurs Google ne mémorise pas le résultat complet du dashboard : chaque requête refait les conversions, agrégations, jointures et la sérialisation. Cela établit un travail répété possible, pas sa contribution mesurée au CPU mensuel.

Le test navigateur avec un build local de production n'a pas abouti. Aucun résultat « un appel » ou « plusieurs appels » n'est acquis pour une ouverture contrôlée.

## Périmètre et contraintes

- Route exacte : `GET /api/dashboard`. Les sous-routes `/api/dashboard/data-quality` et `/api/dashboard/data-quality/issues` sont distinctes.
- Audit sans correctif, changement d'authentification, instrumentation déployée ou déploiement applicatif.
- Aucun test de charge en production.
- Les changements locaux antérieurs d'authentification ne sont pas utilisés pour expliquer le déploiement observé.
- Aucun pourcentage d'économie estimé.

Les opérations d'administration des comptes réalisées antérieurement sont hors périmètre. Elles peuvent néanmoins limiter la disponibilité d'une session compatible avec l'ancien commit pour le test local.

## Sources et traçabilité

| Source | Disponibilité et portée |
|---|---|
| Mesure Vercel communiquée | 3 invocations, 2,22 s de CPU cumulé sur la fenêtre affichée ; bornes exactes et capture non disponibles dans ce dossier |
| CSV fourni | `C:\Users\HP\Downloads\saas-febaco-log-export-2026-10-17T08-55-08.csv`, lu en local |
| Commit communiqué | `1bbc251ca410871d350ed2fbf12bdb2f4e89a797`, inspecté directement dans Git |
| Code de travail | Contient des modifications locales ; ne doit pas être assimilé au déploiement |
| Accès Vercel | Aucun connecteur, CLI authentifiée ou tableau de bord accessible pendant l'audit |
| Navigateur | Inventaire des outils vide : aucun navigateur accessible pour observer Network |

Le CSV n'est pas recopié dans le dépôt : il contient des champs de télémétrie dont l'intégralité n'est pas nécessaire au rapport. Aucun cookie, token, mot de passe, contenu métier ou User-Agent brut n'est inclus ici.

### Déploiement identifié dans le CSV

- Environnement : `production`.
- Branche : `main`.
- Deployment ID : `dpl_JDewd9HXVS7p5RiKuGzqgwYzm21Z`.
- Domaine immuable : `saas-febaco-p3stx5jgn-yoca-souleymane-s-projects.vercel.app`.
- Région des deux requêtes : `iad1`.
- Un seul deployment ID observé dans les 100 lignes exportées.

**Limite : le CSV ne contient pas de commit SHA.** Le rapprochement entre ce déploiement et le commit communiqué par l'utilisateur n'a pas été vérifié indépendamment dans Vercel.

## Mesures disponibles

### Consommation CPU communiquée

| Mesure | Valeur | Limite |
|---|---:|---|
| Invocations Vercel | 3 | Fenêtre exacte à relever |
| CPU actif cumulé | 2,22 s | Ne permet pas d'attribuer un CPU individuel aux deux lignes CSV |
| Moyenne arithmétique conditionnelle | 740 ms/invocation | Valide uniquement si CPU et compteur concernent exactement la même route, le même environnement et la même fenêtre |

La troisième invocation n'est pas expliquée par les deux lignes `/api/dashboard` de l'export. Aucune extrapolation à la consommation mensuelle n'est justifiée.

### Deux requêtes exactes présentes dans le CSV

| Heure UTC, 17 octobre 2026 | Timestamp en ms | Méthode | Statut | Durée écoulée |
|---|---:|---|---:|---:|
| 08:33:09 | 1792225989488 | GET | 200 | 7 030 ms |
| 08:33:10 | 1792225990699 | GET | 200 | 6 547 ms |

Constats sur ces deux lignes :

- Écart entre timestamps : **1 211 ms**.
- `requestId` distincts.
- `instanceId` renseignés et identiques.
- `invocationId` renseignés et identiques.
- `concurrency=3` sur les deux lignes.
- Même User-Agent ; cette égalité ne prouve pas un même utilisateur, onglet ou montage.
- `traceId` et `sessionId` vides ; aucun message applicatif.
- `vercelCache=MISS` sur les deux lignes. Ce champ ne mesure pas le cache Google Sheets en mémoire.

L'égalité des identifiants d'instance et d'invocation est un constat brut. Leur sémantique ne doit pas être surinterprétée : deux lignes HTTP ne doivent pas être comptées automatiquement comme deux invocations facturées indépendantes. `concurrency=3` ne démontre pas trois appels dashboard.

### Séquence autour des appels

L'export contient 100 lignes, avec des horodatages allant de 08:33:07 à 08:33:16 UTC. Ce n'est pas nécessairement l'intégralité du trafic de la fenêtre Vercel. Aucun message applicatif n'est présent dans ces 100 lignes.

Après regroupement des lignes partageant un même `requestId` :

| Heure UTC | Chemin | Observation |
|---|---|---|
| 08:33:07 | `/login` | 307 ; lignes middleware et redirect d'une même requête |
| 08:33:08 | `/dashboard` | 304 ; lignes middleware et static d'une même requête |
| 08:33:09 | `/api/dashboard` | GET 200 ; ligne function |
| 08:33:09 | `/login` | 307 ; lignes middleware et redirect d'une même requête |
| 08:33:10 | `/dashboard` | 304 ; lignes middleware et static d'une même requête |
| 08:33:10 | `/api/dashboard` | GET 200 ; ligne function |

Cette répétition est compatible avec deux passages vers le dashboard. Elle ne prouve ni le motif des redirections, ni leur destination sans les en-têtes correspondants, ni deux montages d'un même onglet. Les paires middleware/static ou middleware/redirect ne sont pas des doublons de requêtes lorsqu'elles partagent le même `requestId`.

## Déclencheurs dans le commit `1bbc251`

Inspection via `git show`, `git grep` et comparaison des fichiers avec le HEAD local. La page dashboard et `lib/dashboard/data.ts` sont identiques au commit. La route API et l'adaptateur Sheets ont des différences locales liées à la nouvelle authentification ; les conclusions ci-dessous reposent sur la version Git du commit.

| Déclencheur | Comportement constaté dans le code |
|---|---|
| Montage de `DashboardPage` | `useEffect(() => { void load() }, [load])` appelle la route |
| Dépendances de l'effet | `load` est défini par `useCallback(..., [])` ; référence stable pendant le montage |
| Changements d'état | Données, erreurs, `loading` et date d'actualisation provoquent des rendus sans relancer cet effet |
| Bouton « Actualiser » | Appelle `load(true)` ; bouton désactivé pendant `loading` |
| Connexion | `router.push(safeNext)` ; montage du dashboard si c'est la destination |
| Navigation quittant puis retrouvant la page | Un nouveau montage peut redéclencher l'effet ; comportement exact à observer dans le navigateur |
| Rechargement complet ou nouvel onglet | Nouveau montage susceptible de déclencher un nouvel appel |
| Focus, visibilité, intervalle | Aucun déclencheur de cette route identifié |
| Changement de session | Aucune dépendance de session ou souscription déclenchant cette route identifiée |
| Erreur HTTP/réseau | Le `catch` affiche une erreur ; pas de retry applicatif de la route |

Un seul emplacement appelle exactement `/api/dashboard` : `app/dashboard/page.tsx`, dans `load()`. L'effet de montage et le bouton réutilisent ce même emplacement.

Le layout ne contient pas deux instances du dashboard. Aucun `template.tsx` imposant un remontage n'a été trouvé. Aucun `AbortController` applicatif n'annule cet appel lors d'un démontage ; cela ne garantit pas qu'une requête survive à une navigation complète du navigateur.

**Piste écartée pour ce commit :** le formulaire local d'activation avec `router.replace(...)` suivi de `router.refresh()` est absent de `1bbc251`. Il ne doit pas expliquer ces logs.

Le préchargement Next.js d'une route ne suffit pas à établir l'exécution de l'effet client. Le cycle supplémentaire des effets sous Strict Mode est réservé au développement : aucune preuve ne permet de lui attribuer les requêtes Production.

## Lectures en cours et cache

### Ce qui peut être partagé

`readSheetRowsBatch`, dans `lib/google-sheets.ts`, utilise :

- `readCache` pour conserver les tableaux bruts de cellules ;
- `pendingBatchReads` pour partager une promesse de lecture batch ;
- une clé de lot fondée sur le classeur et la liste triée des feuilles manquantes.

Deux requêtes dashboard dans une même instance peuvent partager une lecture si leurs lots manquants correspondent exactement, ou bénéficier des valeurs déjà chargées. Des lots partiellement communs mais différents ne sont pas automatiquement fusionnés. Les lectures simples et les lectures batch utilisent des registres de promesses distincts.

Le cache et les promesses sont locaux au processus ; aucune garantie de partage entre instances Vercel. Les TTL par défaut du code sont de 15 minutes pour les référentiels et 2 minutes pour les données opérationnelles. Les valeurs effectives déployées dépendent des variables d'environnement, non vérifiées.

Les `instanceId` identiques du CSV rendent le partage plausible, mais aucun événement cache hit/miss/join ne le confirme.

### Ce qui est refait par requête

Même si les valeurs brutes viennent du cache ou d'une promesse partagée :

1. `sheetValuesToRows` normalise les en-têtes, parcourt les cellules et construit les objets.
2. `loadDashboardData` reconstitue les structures et normalise les acteurs.
3. Les résumés d'affiliations/licences, index, correspondances et jointures nationales sont recalculés.
4. La réponse est sérialisée en JSON.

Il n'y a ni cache du résultat complet ni coalescence de `loadDashboardData` dans le commit. Le service demande sept groupes de lectures batch par appel ; ce nombre ne représente pas nécessairement sept appels réseau Google, en raison du cache et du partage des promesses.

Les retries Google peuvent répéter une tentative de lecture à l'intérieur d'une requête. Ils ne redéclenchent pas le GET navigateur `/api/dashboard`.

## Hypothèses et niveau de preuve

| Proposition | État |
|---|---|
| Deux requêtes HTTP dashboard distinctes sont présentes | Observé : `requestId` distincts |
| Elles appartiennent au même déploiement Production | Observé dans le CSV |
| Le déploiement utilise précisément `1bbc251` | Communiqué par l'utilisateur ; correspondance Vercel non vérifiée |
| Un montage unique provoque deux appels en production | Non démontré ; aucun mécanisme explicite trouvé |
| Deux passages/navigation vers le dashboard expliquent les appels | Compatible avec la séquence ; initiateur et causalité non établis |
| Les deux appels partagent leurs lectures Google | Possible dans le code et compatible avec l'instance commune ; non mesuré |
| Les conversions et jointures sont refaites par requête | Constat statique du commit, même avec cache de valeurs brutes |
| Ces traitements expliquent le CPU mensuel élevé | Non établi |

## Test local de production : exécution et blocage

Copie isolée extraite de l'objet Git exact dans :

`C:\Users\HP\AppData\Local\Temp\febaco-dashboard-prod-1bbc251-20261017-110221`

Les sources applicatives du commit n'ont pas été corrigées. Une configuration locale existante a été copiée sans affichage des valeurs. Les installations et fichiers générés restent dans cette copie ; aucune liaison ou publication Vercel n'a été effectuée.

| Étape exécutée | Résultat |
|---|---|
| `npm ci --no-audit --no-fund` | Réussi : 291 dépendances installées |
| `npm run build` | Next.js 16.2.0 / Turbopack ; essai interrompu sans résultat final |
| `npm run build -- --webpack` | Compilation signalée réussie en 44,7 minutes ; essai interrompu pendant la phase TypeScript |
| `node_modules\.bin\tsc.cmd --noEmit` | Échec confirmé dans les types de routes générés |
| `next start` sur 3100 | Non exécuté : build de production non validé |
| Ouverture unique et comptage Network | Non exécutés ; aucun navigateur accessible |

Erreur TypeScript observée :

```text
.next/types/app/api/upload/club-logo/route.ts(14,13): error TS2344
Property 'clubLogoErrorMessage' is incompatible with index signature.
Type '(error: unknown) => string' is not assignable to type 'never'.
```

La fonction utilitaire exportée existe dans `app/api/upload/club-logo/route.ts` du commit exact. Aucun déplacement de cette fonction, désactivation de TypeScript ou autre contournement n'a été appliqué pendant cet audit.

Le résultat ne démontre pas que le déploiement Vercel ne pouvait pas être construit dans sa configuration d'origine. La commande, le gestionnaire de paquets, le runtime et les paramètres de build Vercel restent à comparer. L'écart doit être expliqué avant de considérer la reproduction locale comme fidèle.

## Protocole navigateur à effectuer après obtention du build

1. Utiliser la copie du SHA vérifié et la configuration de build correspondante. Ne pas substituer silencieusement le code local modifié.
2. Lancer le serveur de production sur le port 3100 : `npm run start -- --port 3100`.
3. Établir une session de test compatible avec ce commit, puis rester sur une autre page. Ne pas fabriquer de cookie ni modifier l'authentification pour le test.
4. Ouvrir DevTools → Network, activer « Preserve log », afficher la colonne « Initiator », puis vider la liste.
5. Ouvrir `http://localhost:3100/dashboard` une seule fois. Ne pas actualiser, cliquer sur « Actualiser », changer d'onglet ou naviguer pendant le chargement.
6. Compter uniquement les GET dont le pathname est exactement `/api/dashboard`. Exclure les sous-routes, les documents `/dashboard`, les préchargements RSC et les lignes middleware du même `requestId`.
7. Relever nombre, initiateur/pile d'appels, heures et statuts. Conserver localement les éléments nécessaires ; ne pas transmettre de cookies, tokens, corps de réponse ou HAR non expurgé.

Résultat attendu par lecture du code : un appel par montage. Résultat expérimental : **non acquis**.

Si un seul appel est observé, poursuivre l'analyse du coût du traitement serveur. Les deux requêtes historiques resteront inexpliquées et ne justifieront pas seules un correctif contre les doublons. Si plusieurs appels sont observés, relier chaque appel à son initiateur avant de proposer une correction.

## Instrumentation minimale proposée, non implémentée

À envisager seulement si l'observation navigateur ne suffit pas, pendant une fenêtre courte et avec échantillonnage cohérent par identifiant aléatoire de page :

| Point | Champs minimaux |
|---|---|
| Client | `pageInstanceId`, `callId`, raison `mount` ou `manual-refresh` |
| Serveur | Identifiant de requête, déploiement, identifiant aléatoire d'instance |
| Lectures | Alias de bloc technique, `hit`/`miss`/`join`, identifiant aléatoire du lot partagé |
| Traitement | Étapes de conversion et d'agrégation exécutées, nombres de lignes, durées explicitement nommées `elapsedMs` |

Ces éléments permettraient de distinguer deux appels d'un même montage, deux montages, deux instances, une lecture partagée et des transformations répétées. Le contexte client doit être propagé à la requête pour permettre la corrélation. Ne pas utiliser une différence de compteurs globaux sous concurrence pour attribuer les événements cache à une requête.

Aucune donnée personnelle, adresse e-mail, identifiant métier, valeur de cellule, URL avec paramètres, cookie, token, secret ou erreur brute dans les logs. Instrumentation désactivée par défaut, bornée en durée et volume ; aucune activation ou publication automatique.

## CPU actif et durées : règles d'interprétation

- Les 7 030 et 6 547 ms sont des durées écoulées, pas du CPU actif.
- L'attente Google, la file de concurrence et les délais de retry restent distincts du travail CPU.
- Les durées de phases proposées sont elles aussi écoulées ; les soustraire à la durée totale ne produit pas une mesure CPU fiable.
- Sous concurrence, `process.cpuUsage()` couvre le processus entier. Son delta ne doit pas être attribué directement à une requête.
- La répétition de transformations ne mesure pas son coût. L'attribution CPU doit reposer sur les métriques de plateforme ou un profilage approprié, avec ses limites explicites.

## Une seule prochaine action

**Récupérer la fiche et les logs de build du déploiement `dpl_JDewd9HXVS7p5RiKuGzqgwYzm21Z` dans Vercel.**

Relever le commit SHA, l'environnement, le répertoire racine, la version Node, le gestionnaire de paquets, les commandes d'installation/build et tout paramètre affectant la validation TypeScript. Ne fournir aucune valeur secrète.

Cette collecte doit confirmer la version et expliquer l'écart de build avant de reprendre le test contrôlé d'ouverture unique.

## Références

- [Commit étudié](https://github.com/Rodanyoca/saas_febaco/commit/1bbc251ca410871d350ed2fbf12bdb2f4e89a797)
- [React — Strict Mode](https://react.dev/reference/react/StrictMode)
- [Next.js — Prefetching](https://nextjs.org/docs/app/guides/prefetching)
- [Vercel — Métriques CLI, dont Active CPU](https://vercel.com/docs/cli/metrics)
- [Vercel — Observability et fonctions](https://vercel.com/docs/observability/insights)
