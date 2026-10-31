import { redirect } from "next/navigation";

type LegacySearchParams = Record<string, string | string[] | undefined>;

export default async function LegacyPresentationsPage({
  searchParams,
}: {
  searchParams: Promise<LegacySearchParams>;
}) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    } else if (value !== undefined) {
      query.append(key, value);
    }
  }
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  redirect(`/gestao/agenda${suffix}`);
}
