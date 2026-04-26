import { getTranslations } from "next-intl/server";
import ChatViewPage from "@/features/chat/components/chat-view-page";

type ChatPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Inbox" });

  return (
    <ChatViewPage
      translationLanguage={locale === "id" ? "id" : "en"}
      copy={{
        loading: t("loading"),
        empty: t("empty"),
        threadEmpty: t("threadEmpty"),
        notes: t("notes"),
        notesEmpty: t("notesEmpty"),
        addNote: t("addNote"),
        notePlaceholder: t("notePlaceholder"),
        saveNote: t("saveNote"),
        noteSaved: t("noteSaved"),
        serviceWindow: t("serviceWindow"),
        serviceWindowClosed: t("serviceWindowClosed"),
        serviceWindowOpen: t("serviceWindowOpen"),
        lastInbound: t("lastInbound"),
        assignedTo: t("assignedTo"),
        unassigned: t("unassigned"),
        assignPlaceholder: t("assignPlaceholder"),
        botReplyState: t("botReplyState"),
        botReplyError: t("botReplyError"),
        pauseBot: t("pauseBot"),
        resumeBot: t("resumeBot"),
        handoffOn: t("handoffOn"),
        handoffOff: t("handoffOff"),
        closeConversation: t("closeConversation"),
        reopenConversation: t("reopenConversation"),
        sendPending: t("sendPending"),
        sendTemplate: t("sendTemplate"),
        manualReplyQueued: t("manualReplyQueued"),
        templateReplyQueued: t("templateReplyQueued"),
        freeformBlocked: t("freeformBlocked"),
        templateFallback: t("templateFallback"),
        templatePreview: t("templatePreview"),
        optedOut: t("optedOut"),
        translationToggle: t("translationToggle"),
        translationHide: t("translationHide"),
        translating: t("translating"),
        translationError: t("translationError"),
        expiringSoon: t("expiringSoon"),
        queueOps: t("queueOps"),
        noQueue: t("noQueue"),
        notifications: t("notifications"),
        noNotifications: t("noNotifications"),
        lifecycle: t("lifecycle"),
        approvalStatus: t("approvalStatus"),
        otpStatus: t("otpStatus"),
        profileSyncStatus: t("profileSyncStatus"),
        connectionStatus: t("connectionStatus"),
        webhookStatus: t("webhookStatus"),
        phoneNumberId: t("phoneNumberId"),
        businessAccountId: t("businessAccountId"),
        statusPending: t("statusPending"),
        statusApproved: t("statusApproved"),
        statusConfigured: t("statusConfigured"),
        statusMissing: t("statusMissing"),
        statusVerified: t("statusVerified"),
        statusReceiving: t("statusReceiving"),
        statusSynced: t("statusSynced"),
        openStatus: t("openStatus"),
        closedStatus: t("closedStatus"),
        stateIdle: t("stateIdle"),
        statePending: t("statePending"),
        stateGenerating: t("stateGenerating"),
        stateQueued: t("stateQueued"),
        stateBlocked: t("stateBlocked"),
        stateFailed: t("stateFailed"),
      }}
    />
  );
}
