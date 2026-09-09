import { notFound } from "next/navigation";
import { LevelBrowser } from "./LevelBrowser";
import { LEVELS, levelMeta } from "../../lib/vocab";

export function generateStaticParams() {
  return LEVELS.map((meta) => ({ level: String(meta.level) }));
}

export default async function LevelPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const meta = levelMeta(Number(level));
  if (!meta) notFound();
  return <LevelBrowser level={meta.level} />;
}
