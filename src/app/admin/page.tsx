import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordAdminAudit, provisionInitialOwner } from "@/lib/admin";
import { AdminDashboardClient } from "@/components/admin/AdminDashboardClient";

export default async function AdminPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?redirect=/admin");
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      adminRole: true,
      totpEnabled: true,
    },
  });

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Secure Initial Owner Provisioning:
  // Strictly requires verified email and phone, and prevents overriding an existing owner
  if (
    process.env.INITIAL_ADMIN_EMAIL &&
    user.email.toLowerCase() === process.env.INITIAL_ADMIN_EMAIL.toLowerCase().trim() &&
    !user.adminRole
  ) {
    const provResult = await provisionInitialOwner(user.id);
    if (provResult.success) {
      user.adminRole = "owner";
    }
  }

  // Server-side authorization check: Reject any non-admin
  if (user.adminRole !== "owner" && user.adminRole !== "support_admin") {
    // Record unauthorized access attempt in security log
    await recordAdminAudit({
      adminId: user.id,
      action: "UNAUTHORIZED_ADMIN_ROUTE_ATTEMPT",
      details: { email: user.email, attemptedPath: "/admin" },
    });

    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-950 border border-red-900/40 text-center space-y-4">
          <div className="inline-flex p-3 rounded-2xl bg-red-950/60 text-red-400 border border-red-800/60">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">403 — Administrative Authority Required</h1>
          <p className="text-xs text-zinc-400">
            Your account ({user.email}) does not possess administrative authorization to access the private panel. This security event has been recorded in the platform audit log.
          </p>
          <div className="pt-2">
            <a
              href="/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-colors"
            >
              Return to Workspace
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboardClient
      currentAdmin={{
        id: user.id,
        email: user.email,
        name: user.name,
        adminRole: user.adminRole as "owner" | "support_admin",
        totpEnabled: user.totpEnabled,
      }}
    />
  );
}
