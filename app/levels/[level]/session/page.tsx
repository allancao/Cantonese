import { notFound } from "next/navigation";
import { DictationSession } from "./DictationSession";
import { LEVELS, levelMeta } from "../../../lib/vocab";

export function generateStaticParams() {
  return LEVELS.map((meta) => ({ level: String(meta.level) }));
}

export default async function SessionPage({ params }: { params: Promise<{ level: string }> }) {
  const { level } = await params;
  const meta = levelMeta(Number(level));
  if (!meta) notFound();
  return (
    <main>
      <DictationSession level={meta.level} />
    </main>
  );
}
