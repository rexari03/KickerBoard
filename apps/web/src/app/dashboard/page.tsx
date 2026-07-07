import { UserDashboard } from "../user-dashboard";

export default function DashboardPage() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-5 px-4 py-6 sm:px-5 md:gap-6 md:px-8 md:py-8">
      <section className="grid gap-2">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Dashboard</p>
        <h1 className="m-0 text-3xl font-extrabold sm:text-4xl md:text-5xl">
          Deine Übersicht
        </h1>
        <p className="m-0 max-w-2xl leading-7 text-[#667064]">
          Persönliche Turnier- und Matchstatistiken auf einen Blick.
        </p>
      </section>

      <UserDashboard />
    </main>
  );
}
