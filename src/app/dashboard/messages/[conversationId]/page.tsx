import DashboardMessages from "@/components/messages/DashboardMessages";

type DashboardMessagesConversationPageProps = {
  params: { conversationId: string };
};

export default function DashboardMessagesConversationPage({
  params,
}: DashboardMessagesConversationPageProps) {
  return <DashboardMessages conversationId={params.conversationId} />;
}
