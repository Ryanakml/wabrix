import { Protect } from "@clerk/nextjs";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Welcome to the Dashboard</h1>
      <p className="mt-4 text-muted-foreground">
        Select an organization from the switcher above to start managing WhatsApp bots.
      </p>

      <Protect
        condition={(has) => has({ permission: "org:sys_profile:manage" }) || has({ role: "org:admin" })}
        fallback={<p className="mt-4 text-sm text-red-500">You do not have permission to manage this organization.</p>}
      >
        <div className="mt-6 rounded-lg border p-4 bg-background">
          <h2 className="text-lg font-semibold">Admin Settings</h2>
          <p className="text-sm mt-2 text-muted-foreground">
            You can see this because you are an admin.
          </p>
        </div>
      </Protect>
    </div>
  );
}
