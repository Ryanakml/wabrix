import React from "react";

export default function PageContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4">{children}</div>;
}
