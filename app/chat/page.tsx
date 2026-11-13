import type { Metadata } from "next";
import Navbar from "@/components/navbar";
import ChatPageClient from "@/components/chat-page-client";

export const metadata: Metadata = {
  title: "Chat — Hymn Router",
  description:
    "Playground chat Hymn Router: coba 9 provider LLM gratis tanpa login, tanpa API key.",
};

export default function ChatPage() {
  return (
    <div className="flex-1">
      <Navbar />
      <ChatPageClient />
    </div>
  );
}
