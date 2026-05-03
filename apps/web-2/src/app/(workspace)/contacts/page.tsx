import PageContainer from "@/components/layout/page-container";
import { ContactsPage } from "@/features/contacts/components/contacts-page";

export const metadata = {
  title: "Dashboard: Contacts",
};

export default async function ContactsWorkspacePage() {
  return (
    <PageContainer
      pageTitle="Contacts"
      pageDescription="Browse synced WhatsApp contacts and jump directly into their conversations."
    >
      <ContactsPage />
    </PageContainer>
  );
}
