import { UserDashboard } from "../user-dashboard";

export default function DashboardPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-start gap-6 px-5 py-8 md:px-8">
      <section className="grid gap-2">
        <p className="m-0 text-xs font-bold uppercase text-[#2f6f4e]">Dashboard</p>
        <h1 className="m-0 text-4xl font-extrabold md:text-5xl">
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
