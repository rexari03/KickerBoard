import { TournamentDetailPage } from "../../tournament-detail";

type TournamentPageProps = {
  params: Promise<{
    tournamentId: string;
  }>;
};

export default async function TournamentPage({ params }: TournamentPageProps) {
  const { tournamentId } = await params;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-start gap-6 px-5 py-8 md:px-8">
      <TournamentDetailPage tournamentId={tournamentId} />
    </main>
  );
}
