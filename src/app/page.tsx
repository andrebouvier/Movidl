import DailyGame from "@/components/DailyGame";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const sp = await searchParams;
  return <DailyGame initialDate={sp.date} />;
}
