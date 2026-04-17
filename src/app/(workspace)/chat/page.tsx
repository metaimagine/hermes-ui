import { ChatConsole } from "@/components/chat-console";
import { getSessions } from "@/lib/hermes/server";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function ChatPage() {
  const prefs = await getUiPrefs();
  const sessions = await getSessions();
  return <ChatConsole messages={prefs.messages} sessions={sessions.slice(0, 6)} />;
}
