export type NavAccess = {
  requireOrg?: boolean;
};

export type NavItem = {
  title: string;
  url: string;
  icon?: keyof typeof import("@/components/icons").Icons;
  isActive?: boolean;
  shortcut?: string[];
  items?: NavItem[];
  access?: NavAccess;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: "dashboard",
        isActive: false,
        shortcut: ["d", "d"],
        items: [],
      },
      {
        title: "Workspaces",
        url: "/dashboard/workspaces",
        icon: "workspace",
        isActive: false,
        items: [],
      },
      {
        title: "Product",
        url: "/dashboard/product",
        icon: "product",
        shortcut: ["p", "p"],
        isActive: false,
        items: [],
      },
      {
        title: "Users",
        url: "/dashboard/users",
        icon: "teams",
        shortcut: ["u", "u"],
        isActive: false,
        items: [],
      },
      {
        title: "Kanban",
        url: "/dashboard/kanban",
        icon: "kanban",
        shortcut: ["k", "k"],
        isActive: false,
        items: [],
      },
      {
        title: "Chat",
        url: "/dashboard/chat",
        icon: "chat",
        shortcut: ["c", "c"],
        isActive: false,
        items: [],
      },
      {
        title: "Bot Profile",
        url: "/dashboard/bot-profile",
        icon: "bot",
        shortcut: ["b", "p"],
        isActive: false,
        items: [],
      },
      {
        title: "Knowledge Base",
        url: "/dashboard/knowledge-base",
        icon: "workspace",
        shortcut: ["g", "b"],
        isActive: false,
        items: [],
      },
      {
        title: "WhatsApp Integration",
        url: "/dashboard/whatsapp-integration",
        icon: "phone",
        shortcut: ["w", "i"],
        isActive: false,
        items: [],
      },
    ],
  },
  {
    label: "",
    items: [
      {
        title: "Account",
        url: "#",
        icon: "account",
        isActive: true,
        items: [
          {
            title: "Profile",
            url: "/dashboard/profile",
            icon: "profile",
            shortcut: ["m", "m"],
          },
          {
            title: "Notifications",
            url: "/dashboard/notifications",
            icon: "notification",
            shortcut: ["n", "n"],
          },
          {
            title: "Billing",
            url: "/dashboard/billing",
            icon: "billing",
            shortcut: ["b", "b"],
            access: { requireOrg: true },
          },
          {
            title: "Login",
            shortcut: ["l", "l"],
            url: "/onboarding",
            icon: "login",
          },
        ],
      },
    ],
  },
];
