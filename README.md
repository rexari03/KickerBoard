# KickerBoard

Intelligentes Scoreboard zum Erfassen, Auswerten und Vergleichen von Kicker-Ergebnissen.

## Produktziel

KickerBoard soll Spielern erlauben, sich mit eigenen Login-Daten anzumelden, Spiele einzutragen und Rankings sowie persönliche Statistiken einzusehen. Admins sollen Spieler verwalten und fehlerhafte Ergebnisse korrigieren koennen.

## Architekturentscheidung

### Frontend

- Next.js mit App Router
- TypeScript
- Responsive Web UI, optimiert fuer mobile Nutzung am Kickertisch
- Spaeter optional als PWA installierbar

### Backend

Das Backend soll als eigener Service auf dem Homeserver laufen.

Geplante Basis:

- Node.js mit TypeScript
- Fastify oder NestJS
- PostgreSQL als Datenbank
- Prisma als ORM
- Docker Compose fuer lokalen und Homeserver-Betrieb

Empfehlung fuer den Start: Fastify.

Fastify passt gut, wenn das Backend schlank bleiben soll: Auth, Spieler, Matches, Rankings, Admin-Funktionen. NestJS ist sinnvoll, falls sehr frueh viele Module, komplexe Business-Logik, Event-Systeme oder groessere Team-Strukturen erwartet werden. Fuer KickerBoard ist Fastify zum Start pragmatischer und laesst sich sauber strukturieren.

## Geplanter MVP

### Spielerfunktionen

- Login
- Eigenes Spielerprofil
- Match erfassen
- Match-Historie ansehen
- Ranking ansehen
- Persoenliche Statistiken ansehen

### Admin-Funktionen

- Spieler anlegen, bearbeiten und deaktivieren
- Ergebnisse korrigieren oder loeschen
- Spielmodi konfigurieren

### Spielmodi

Startumfang:

- 1v1
- 2v2

## Ranking

Erste Version:

- Sieg/Niederlage
- Anzahl Spiele
- Gewinnquote
- erzielte und kassierte Punkte

Spaetere Erweiterung:

- Elo-Rating fuer 1v1
- angepasstes Team-Rating fuer 2v2
- saisonale Rankings
- Formkurve und Serien

## Datenmodell

Voraussichtliche Kern-Entities:

- User
- PlayerProfile
- Match
- MatchParticipant
- Season
- RatingSnapshot
- AuditLog

## Deployment-Ziel

Homeserver per Docker Compose:

- Next.js Frontend
- Fastify/NestJS API
- PostgreSQL
- Reverse Proxy, voraussichtlich Caddy
- Datenbank-Backups

## Naechste Schritte

1. Fastify-API fachlich ausbauen
2. Next.js-App fachlich ausbauen
3. PostgreSQL und Prisma einrichten
4. Auth-Konzept umsetzen
5. Match-Erfassung und Ranking-MVP bauen
6. Homeserver-Deployment mit Docker Compose erweitern

## Repository-Struktur

```text
apps/
  web/      # Next.js Frontend
  api/      # Fastify Backend
packages/
  shared/   # gemeinsame Types und Konstanten
```

## Lokale Entwicklung

Nach Installation der Dependencies:

```bash
npm install
npm run dev:web
```

Die API stellt initial `GET /health` bereit.

## Datenbank

Das initiale Prisma-Schema liegt unter `apps/api/prisma/schema.prisma`.

Nach Installation der Dependencies und gestarteter PostgreSQL-Datenbank:

```bash
cp apps/api/.env.example apps/api/.env
docker compose up -d postgres
npm run db:generate
npm run db:migrate
```

Das MVP-Ranking wird aus abgeschlossenen Matches berechnet. Primaere Sortierung ist die Siegquote, ergaenzt um eine Mindestanzahl an Spielen, Siege, Punktedifferenz und Anzahl gespielter Matches als Tie-Breaker.

## API MVP

Initiale Endpunkte:

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /players`
- `POST /players`
- `GET /matches`
- `POST /matches`
- `GET /rankings`

Die Authentifizierung nutzt serverseitige Sessions. Das Session-Token liegt im Browser als `HttpOnly`-Cookie, in der Datenbank wird nur der Hash des Tokens gespeichert.

Nach Aenderungen am Auth-Schema:

```bash
cd apps/api
npx prisma migrate dev --name add_auth_sessions
```

Beispiel fuer einen Spieler:

```json
{
  "email": "spieler@example.com",
  "displayName": "Spieler 1"
}
```

Beispiel fuer ein 1v1-Match:

```json
{
  "mode": "ONE_VS_ONE",
  "createdByUserId": "user-id",
  "teams": [
    {
      "side": "A",
      "score": 10,
      "playerIds": ["player-profile-id-a"]
    },
    {
      "side": "B",
      "score": 7,
      "playerIds": ["player-profile-id-b"]
    }
  ]
}
```
