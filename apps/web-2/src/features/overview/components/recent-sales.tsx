import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Link from "next/link";

type RecentSalesProps = {
  data: {
    recentMessages: Array<{
      id: string;
      contactName: string;
      phone: string | null;
      initials: string;
      latestIncomingPreview: string;
      latestIncomingAt: number;
      conversationId: string;
    }>;
  };
};

export function RecentSales({ data }: RecentSalesProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Messages</CardTitle>
        <CardDescription>
          Latest inbound chat activity across your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.recentMessages.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No incoming messages yet.
            </p>
          ) : (
            data.recentMessages.map((message) => (
              <Link
                key={message.id}
                href={`/chat?conversationId=${message.conversationId}`}
                className="hover:bg-muted/50 flex items-center gap-3 rounded-xl px-1 py-1 transition"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage alt="Avatar" />
                  <AvatarFallback>{message.initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm leading-none font-medium">
                      {message.contactName}
                    </p>
                    <span className="text-muted-foreground shrink-0 text-[0.7rem]">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(message.latestIncomingAt))}
                    </span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {message.phone ?? "Unknown number"}
                  </p>
                  <p className="text-muted-foreground line-clamp-2 text-xs">
                    {message.latestIncomingPreview}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
