import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ChatPageClient from "@/components/chat-page-client";
import { dict, getLocale } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const t = dict[await getLocale()];
  return { title: t.meta.chatTitle, description: t.meta.chatDescription };
}

export default function ChatPage() {
  return (
    <div className="flex-1">
      <Navbar />
      <ChatPageClient />
    </div>
  );
}
