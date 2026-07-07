import { APP_NAME } from "@kicker-board/shared";
import { Dashboard } from "./dashboard";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-start gap-6 px-5 py-8 md:px-8">
      <section className="grid gap-4 pt-12">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
          Kicker Scoreboard
        </p>
        <h1 className="m-0 text-7xl leading-none md:text-8xl">{APP_NAME}</h1>
        <p className="m-0 max-w-2xl leading-7 text-[#3f4b40]">
          Spieler verwalten, Matches erfassen und Rankings anhand der Siegquote
          sichtbar machen.
        </p>
      </section>

      <Dashboard />
    </main>
  );
}
