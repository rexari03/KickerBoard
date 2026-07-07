import { APP_NAME } from "@kicker-board/shared";
import { PlayersPanel } from "./players-panel";

export default function Home() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Kicker Scoreboard</p>
        <h1>{APP_NAME}</h1>
        <p>
          Spieler verwalten, Matches erfassen und Rankings anhand der Siegquote
          sichtbar machen.
        </p>
      </section>

      <PlayersPanel />
    </main>
  );
}
