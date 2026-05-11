import DashboardMessages from "@/components/messages/DashboardMessages";

type DashboardMessagesConversationPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function DashboardMessagesConversationPage({
  params,
}: DashboardMessagesConversationPageProps) {
  const { conversationId } = await params;
  return <DashboardMessages conversationId={conversationId} />;
}
