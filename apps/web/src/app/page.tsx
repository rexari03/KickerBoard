import { APP_NAME } from "@kicker-board/shared";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Kicker Scoreboard</p>
        <h1>{APP_NAME}</h1>
        <p>
          Erfasse Matches, verfolge Rankings und mache Kicker-Ergebnisse fuer
          alle Spieler transparent.
        </p>
      </section>

      <section className="panel" aria-label="Naechste Umsetzungsschritte">
        <h2>MVP Fokus</h2>
        <ul>
          <li>Login fuer Spieler</li>
          <li>Match-Erfassung fuer 1v1 und 2v2</li>
          <li>Ranking und Spielerstatistiken</li>
          <li>Admin-Bereich fuer Korrekturen</li>
        </ul>
      </section>
    </main>
  );
}
