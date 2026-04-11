import { AppShell } from "@/components/app-shell";
import { getOverviewData } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const [overview, prefs] = await Promise.all([getOverviewData(), getUiPrefs()]);
  return <AppShell overview={overview} lang={prefs.lang} theme={prefs.theme} messages={prefs.messages}>{children}</AppShell>;
}
