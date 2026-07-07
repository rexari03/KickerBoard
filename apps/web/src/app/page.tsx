import { APP_NAME } from "@kicker-board/shared";
import Link from "next/link";
import { HomeAuthCard } from "./home-auth-card";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-start gap-6 px-5 py-8 md:px-8">
      <section className="grid gap-4 pt-8">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
          Kicker Scoreboard
        </p>
        <h1 className="m-0 text-7xl leading-none md:text-8xl">{APP_NAME}</h1>
        <p className="m-0 max-w-2xl leading-7 text-[#3f4b40]">
          Erstelle Turniere, lass Spieler per Passwort beitreten und tracke
          Matches mit Ranking pro Turnier.
        </p>
        <Link
          className="mt-2 w-fit rounded-lg bg-[#265c42] px-5 py-3 font-extrabold text-white"
          href="/tournaments"
        >
          Zu den Turnieren
        </Link>
      </section>

      <HomeAuthCard />
    </main>
  );
}
