# Seanime_Torrent_Prowlarr

Extension Seanime (type `anime-torrent-provider`) qui interroge l'API Prowlarr pour rechercher des torrents sur les indexeurs déjà enregistrés dans Prowlarr.

## Fichiers

- Manifest: `prowlarr-torrent-provider.json`
- Payload: `prowlarr-torrent-provider.ts`
- Types: `anime-torrent-provider.d.ts`

## Configuration Seanime

Dans `userConfig` :

- `prowlarrBaseUrl` : URL de Prowlarr (ex: `http://localhost:9696`)
- `prowlarrApiKey` : clé API Prowlarr
- `indexerIds` : ids d'indexeurs séparés par des virgules (optionnel)
- `resultLimit` : nombre max de résultats

## Comportement

- Recherche standard et smart search via `GET /api/v1/search`
- Filtrage optionnel par `indexerIds`
- Mapping des résultats Prowlarr vers le format `AnimeTorrent`
- Récupération du magnet/infoHash quand disponibles
