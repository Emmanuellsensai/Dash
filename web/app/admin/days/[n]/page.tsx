import { notFound } from "next/navigation";
import { getDayWithRules } from "@/lib/db";
import { ruleTypeInfos } from "@/lib/engine/registry";
import DayEditor from "./DayEditor";

export const dynamic = "force-dynamic";

export default async function AdminDayPage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  const dayNumber = Number(n);
  const data = Number.isInteger(dayNumber) ? await getDayWithRules(dayNumber) : null;
  if (!data) notFound();
  return (
    <DayEditor
      initialDay={data.day}
      initialRules={data.rules}
      ruleTypes={ruleTypeInfos()}
    />
  );
}
