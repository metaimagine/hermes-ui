import { ChatConsole } from "@/components/chat-console";
import { PageHeader } from "@/components/page-header";
import { getUiPrefs } from "@/lib/ui/i18n";

export default async function ChatPage() {
  const prefs = await getUiPrefs();
  const t = prefs.messages.pages.chat;
  return (
    <div className="stack-xl">
      <PageHeader eyebrow={t.eyebrow} title={t.title} description={t.description} />
      <ChatConsole messages={prefs.messages} />
    </div>
  );
}
