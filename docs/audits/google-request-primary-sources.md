# Sources primaires — maîtrise des requêtes Google et cache Next.js 16

Consultation effectuée le 14 septembre 2026. Ce document ne décrit que les recommandations utiles à l’audit FEBACO ; il ne modifie ni les classeurs ni leur structure.

## Google Sheets API

- Les quotas publiés sont calculés à la minute, séparément pour les lectures et les écritures. La documentation indique notamment 300 requêtes/minute/projet et 60 requêtes/minute/utilisateur/projet. Elle précise aussi qu’un compte de service est comptabilisé comme un seul utilisateur : des rafales concurrentes depuis plusieurs pages peuvent donc épuiser très vite la limite par utilisateur. Une réponse de dépassement prend la forme d’un HTTP `429`. [Usage limits — Google Sheets API](https://developers.google.com/workspace/sheets/api/limits)
- Google recommande un **backoff exponentiel tronqué avec aléa (jitter)** pour les erreurs temporelles de quota : délai croissant, plafond, valeur aléatoire recalculée à chaque tentative et nombre maximal de tentatives. Les boucles de retry infinies sont explicitement déconseillées. [Usage limits — Google Sheets API](https://developers.google.com/workspace/sheets/api/limits)
- Les appels `spreadsheets.values.batchGet` et `spreadsheets.values.batchUpdate` regroupent plusieurs plages dans une requête. Google recommande de combiner les lectures ou écritures multiples avec ces méthodes pour gagner en efficacité. Une requête batch compte comme une requête API, et une mise à jour Sheets est atomique : une sous-opération invalide fait échouer l’ensemble. [Read and write cell values](https://developers.google.com/workspace/sheets/api/guides/values), [Method: spreadsheets.values.batchGet](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet), [Usage limits](https://developers.google.com/workspace/sheets/api/limits)
- Pour réduire coût et latence, Google conseille de demander uniquement les plages nécessaires en notation A1, de limiter `includeGridData`, d’utiliser les masques de champs et de regrouper les mises à jour liées. La page de dépannage recommande aussi de limiter la concurrence à environ une requête par seconde et par classeur. [Troubleshoot API errors — Google Sheets API](https://developers.google.com/workspace/sheets/api/troubleshoot-api-errors)
- La taille conseillée d’une requête est au plus 2 Mo et une requête Sheets peut expirer après 180 secondes. Le batching doit donc réduire le nombre d’appels sans créer des lots disproportionnés. [Usage limits — Google Sheets API](https://developers.google.com/workspace/sheets/api/limits)

### Conséquence pour FEBACO

La stratégie conforme est de partager un client serveur, fusionner les lectures simultanées identiques, utiliser `batchGet` pour les feuilles d’un même classeur, limiter la concurrence par classeur et réserver les retries aux lectures et aux écritures dont l’idempotence est démontrée. Un `Retry-After` transmis par la réponse doit avoir priorité sur le délai local ; les pages Sheets citées ne garantissent cependant pas que cet en-tête soit toujours présent, donc le backoff avec jitter reste le repli obligatoire.

## Google Drive API

- Drive applique des quotas par projet et par utilisateur/projet. En cas de dépassement, l’API peut répondre `403 userRateLimitExceeded` ou `429 rateLimitExceeded`. Google demande alors de réduire le rythme et d’utiliser un backoff exponentiel. [Usage limits — Google Drive API](https://developers.google.com/workspace/drive/api/guides/limits)
- Les erreurs `500`, `502`, `503` et `504` sont considérées comme potentiellement transitoires et la documentation Drive recommande un backoff exponentiel. Les erreurs permanentes d’autorisation ou de requête ne doivent donc pas être rejouées aveuglément. [Resolve errors — Google Drive API](https://developers.google.com/workspace/drive/api/guides/handle-errors)
- Le coût dépend de la méthode : par exemple `files.list` coûte davantage que `files.get`. Réutiliser les identifiants déjà connus et éviter les recherches/listages répétés réduit donc à la fois latence et consommation de quota. [Usage limits — Google Drive API](https://developers.google.com/workspace/drive/api/guides/limits)

### Conséquence pour FEBACO

Les opérations Drive doivent passer par la même passerelle de résilience que Sheets, avec une limite de concurrence propre à Drive, une classification des erreurs par code/reason et des logs sans identifiants sensibles. Les uploads et mutations ne doivent être retentés que si leur clé d’idempotence ou leur vérification post-échec empêche les doublons.

## Next.js 16.2

Le dépôt utilise Next.js `16.2.0`, mais `next.config.mjs` n’active pas `cacheComponents`. Les recommandations applicables immédiatement sont donc celles du modèle de cache précédent documenté par Next.js 16 :

- un `fetch` n’est pas mis en cache par défaut ; `cache: 'force-cache'` ou `next.revalidate` rendent la politique explicite ;
- les appels non-`fetch` peuvent être enveloppés dans `cache` de React pour dédupliquer une même lecture pendant un rendu, ou dans `unstable_cache` pour une réutilisation persistante et une revalidation temporelle ;
- `revalidatePath` et `revalidateTag` permettent d’invalider après mutation. [Caching and Revalidating (Previous Model) — Next.js](https://nextjs.org/docs/app/guides/caching-without-cache-components)

Next.js 16 propose aussi le modèle opt-in Cache Components (`cacheComponents: true`) avec la directive `use cache`, `cacheLife`, `cacheTag`, `revalidateTag` et `updateTag`. L’activation changerait toutefois le modèle de rendu global et ne doit pas être faite uniquement pour corriger les quotas Google sans audit fonctionnel séparé. [Cache Components — Next.js](https://nextjs.org/docs/app/getting-started/partial-prerendering), [Upgrading to Next.js 16](https://nextjs.org/docs/app/guides/upgrading/version-16)

### Conséquence pour FEBACO

La couche Google doit posséder son propre cache/coalescing côté serveur, indépendant du cycle de rendu. Pour les données de référence stables, un TTL long et une invalidation après écriture sont adaptés. Pour les données opérationnelles, un TTL court et configurable limite la latence sans masquer les mises à jour. Les appels client vers les routes internes doivent eux aussi être dédupliqués afin qu’un montage React ou plusieurs composants ne déclenchent pas plusieurs lectures Google équivalentes.

## Règles d’implémentation dérivées

1. Regrouper par classeur et utiliser `batchGet`/`batchUpdate` quand plusieurs plages sont nécessaires au même écran.
2. Coalescer les lectures identiques en vol et mettre en cache les données stables avec une clé comprenant classeur, feuille, plage et mode de rendu.
3. Borner la concurrence, le délai par appel et le nombre de retries ; appliquer un backoff exponentiel avec jitter sur `429`, `403` de quota et `5xx` transitoires.
4. Ne jamais relancer automatiquement une écriture non idempotente ; vérifier l’état final après une réponse ambiguë avant toute nouvelle tentative.
5. Invalider précisément les caches touchés après une mutation réussie.
6. Instrumenter chaque requête avec module appelant, opération, catégorie de plage, durée, cache hit/miss, tentative et catégorie d’erreur, sans journaliser de données personnelles ni de secrets.
