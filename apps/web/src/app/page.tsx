import { APP_NAME } from "@kicker-board/shared";
import Link from "next/link";
import { HomeAuthCard } from "./home-auth-card";

export default function Home() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-5 px-4 py-6 sm:px-5 md:gap-6 md:px-8 md:py-8">
      <section className="grid gap-4 pt-4 sm:pt-8">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">
          Kicker Scoreboard
        </p>
        <h1 className="m-0 text-5xl leading-none sm:text-6xl md:text-8xl">
          {APP_NAME}
        </h1>
        <p className="m-0 max-w-2xl leading-7 text-[#3f4b40]">
          Erstelle Turniere, lass Spieler per Passwort beitreten und tracke
          Matches mit Ranking pro Turnier.
        </p>
        <Link
          className="mt-2 w-full rounded-lg bg-[#265c42] px-5 py-3 text-center font-extrabold text-white sm:w-fit"
          href="/tournaments"
        >
          Zu den Turnieren
        </Link>
      </section>

      <HomeAuthCard />
    </main>
  );
}
