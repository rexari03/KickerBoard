import { TournamentDetailPage } from "../../tournament-detail";

type TournamentPageProps = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { tournamentId } = await params;

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl content-start gap-5 px-4 py-6 sm:px-5 md:gap-6 md:px-8 md:py-8">
      <TournamentDetailPage tournamentId={tournamentId} />
    </main>
  );
}
