"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@wabrix/backend/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function ContactsPage() {
  const router = useRouter();
  const contactsState = useQuery(api.inbox.getInboxContactsState, {}) as
    | {
        contacts: Array<{
          id: string;
          name: string;
          phone: string;
          status: string | null;
          conversationId: string | null;
        }>;
      }
    | undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        <p className="text-muted-foreground text-sm">
          Real WhatsApp contacts linked to active conversations.
        </p>
      </CardHeader>
      <CardContent>
        {!contactsState ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="grid grid-cols-3 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : contactsState.contacts.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border px-4 py-8 text-sm">
            No contacts synced yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactsState.contacts.map(
                (contact: {
                  id: string;
                  name: string;
                  phone: string;
                  status: string | null;
                  conversationId: string | null;
                }) => {
                  const clickable = Boolean(contact.conversationId);

                  return (
                    <TableRow
                      key={String(contact.id)}
                      className={
                        clickable
                          ? "hover:bg-muted/50 cursor-pointer transition-colors"
                          : ""
                      }
                      onClick={() => {
                        if (!contact.conversationId) {
                          return;
                        }

                        router.push(
                          `/chat?conversationId=${contact.conversationId}&highlightConversationId=${contact.conversationId}`,
                        );
                      }}
                    >
                      <TableCell className="font-medium">
                        {contact.name}
                      </TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>{contact.status ?? "—"}</TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
