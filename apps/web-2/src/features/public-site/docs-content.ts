export type DocSection = {
  title: string;
  body: string[];
};

export type DocPage = {
  href: string;
  title: string;
  description: string;
  category: 'Getting started' | 'WhatsApp operations';
  eyebrow: string;
  intro: string;
  highlights: string[];
  sections: DocSection[];
};

export const docsPages: DocPage[] = [
  {
    href: '/docs/setup',
    title: 'Workspace setup',
    description: 'Prepare your Wabrix workspace, access model, and WhatsApp configuration flow.',
    category: 'Getting started',
    eyebrow: 'Setup',
    intro:
      'Use this checklist to move from first sign-in to a production-ready workspace without skipping access control or message-delivery basics.',
    highlights: [
      'Sign in, join or create the correct organization, and confirm who can manage integrations.',
      'Connect the active bot, WhatsApp credentials, and webhook before enabling message transport.',
      'Load knowledge sources, prompts, and routing rules before sending live outbound traffic.'
    ],
    sections: [
      {
        title: '1. Prepare the workspace',
        body: [
          'Start with the organization that should own the inbox, billing, bot configuration, and WhatsApp integration settings.',
          'Keep admin access limited to the operators who actually need to manage credentials, templates, or workspace-wide settings.'
        ]
      },
      {
        title: '2. Connect the operational pieces',
        body: [
          'Wabrix is designed around a shared inbox, bot configuration, knowledge sources, and a WhatsApp integration layer. Configure those pieces in that order so routing and replies have usable context.',
          'Before enabling live transport, verify the active bot, credentials, and webhook settings are all configured for the same workspace.'
        ]
      },
      {
        title: '3. Validate before launch',
        body: [
          'Check that message templates are available for conversations outside the 24-hour service window.',
          'Run a small internal test flow first, then review conversation details, queue status, and operational logs before widening access.'
        ]
      }
    ]
  },
  {
    href: '/docs/whatsapp/waba-lifecycle',
    title: 'WABA lifecycle',
    description: 'Understand the connection and approval states that shape WhatsApp operations.',
    category: 'WhatsApp operations',
    eyebrow: 'WhatsApp',
    intro:
      'Wabrix surfaces the main operational checkpoints you need to keep a WhatsApp Business setup healthy: connection, webhook, approval, OTP, and profile sync.',
    highlights: [
      'Conversation details already expose lifecycle fields such as connection, webhook, approval, OTP, and profile sync status.',
      'A working phone number ID and business account ID are part of the operational baseline.',
      'Lifecycle issues should be resolved before scaling live traffic or relying on automation.'
    ],
    sections: [
      {
        title: 'Connection and webhook state',
        body: [
          'The integration must stay connected and the webhook must continue receiving status and message events. If either state drifts, message delivery and template sync become unreliable.',
          'Treat webhook health as a production dependency, not a one-time setup step.'
        ]
      },
      {
        title: 'Approval and OTP checkpoints',
        body: [
          'Approval status and OTP status affect whether a number is ready for live use or still waiting on external verification steps.',
          'Resolve outstanding approval tasks early so launch timelines are not blocked by platform review work.'
        ]
      },
      {
        title: 'Profile sync and identifiers',
        body: [
          'Phone number ID and business account ID should match the environment your operators are actually managing.',
          'Profile sync should be reviewed whenever credentials change, templates are refreshed, or a number is moved between environments.'
        ]
      }
    ]
  },
  {
    href: '/docs/whatsapp/template-approval',
    title: 'Template approval',
    description: 'Keep approved WhatsApp templates ready for messaging outside the service window.',
    category: 'WhatsApp operations',
    eyebrow: 'WhatsApp',
    intro:
      'Templates are not optional once the customer service window closes. Wabrix gives your team a place to create, sync, review, and archive template records, but template quality and compliance still belong to your workspace.',
    highlights: [
      'Templates can be created, edited, synced from Meta, and archived inside the integration settings.',
      'Category, language code, and body content all matter for approval outcomes.',
      'If Meta rejects or limits a template, your team needs to revise copy or components and resubmit.'
    ],
    sections: [
      {
        title: 'When templates are required',
        body: [
          'Outside the customer service window, outbound messaging must use an approved WhatsApp template.',
          'Keep re-engagement, shipping, billing, and operational update templates ready before those flows are needed.'
        ]
      },
      {
        title: 'What to review before submission',
        body: [
          'Use clear template names, valid language codes, and concise body text that matches the real use case.',
          'Choose the correct category and keep placeholders understandable so approval reviewers and operators can both interpret the message intent.'
        ]
      },
      {
        title: 'How to operate after approval',
        body: [
          'Sync templates regularly so Wabrix reflects the current status, rejection reason, and latest approved copy from Meta.',
          'If a template is rejected, update the copy or structure first. Do not assume a previously working template will stay approved forever.'
        ]
      }
    ]
  },
  {
    href: '/docs/whatsapp/media-processing',
    title: 'Media processing',
    description: 'Handle media inputs with clear expectations for review, routing, and downstream use.',
    category: 'WhatsApp operations',
    eyebrow: 'WhatsApp',
    intro:
      'Media attachments can affect response quality, support workflows, and auditability. Treat them as operational inputs that may need human review, not just files in transit.',
    highlights: [
      'Media events should be reviewed in the same operational flow as message history and queue status.',
      'Only keep media that your workspace has the right to store, process, summarize, or send to downstream providers.',
      'If a file is important for support or compliance, keep the human handoff path clear.'
    ],
    sections: [
      {
        title: 'Operational handling',
        body: [
          'Media should be visible in the context of the conversation so operators can decide whether automation has enough context to continue.',
          'Use human review when the attachment materially changes the answer, approval path, or next action.'
        ]
      },
      {
        title: 'Knowledge and downstream processing',
        body: [
          'Do not push media into knowledge or AI-assisted flows unless your workspace actually needs that processing and has the right to do it.',
          'Treat uploaded content as workspace data with the same operational and policy responsibility as text messages.'
        ]
      },
      {
        title: 'Retention and traceability',
        body: [
          'If a media-driven decision affects customer support, keep enough traceability for the team to understand who handled it and what happened next.',
          'Operational logs and conversation history are more useful when they stay connected to the same workspace process.'
        ]
      }
    ]
  },
  {
    href: '/docs/whatsapp/service-window',
    title: 'Service window rules',
    description: 'Understand how the 24-hour service window affects manual and AI replies.',
    category: 'WhatsApp operations',
    eyebrow: 'WhatsApp',
    intro:
      'Wabrix already distinguishes between open and closed service-window states in inbox and orchestration flows. That rule changes what kind of outbound reply can be sent.',
    highlights: [
      'Open service window: freeform manual replies and bot replies can continue.',
      'Closed service window: freeform replies are blocked and you need an approved template.',
      'Conversations that are about to expire should be treated as operationally urgent.'
    ],
    sections: [
      {
        title: 'What the rule changes',
        body: [
          'When the window is open, operators can queue manual replies and automation can continue if no other blocking condition is active.',
          'When the window closes, freeform manual and AI replies should stop. Re-engagement needs an approved template instead.'
        ]
      },
      {
        title: 'How Wabrix behaves',
        body: [
          'Backend tests already enforce that manual freeform replies are blocked after the 24-hour window closes.',
          'Bot orchestration also blocks freeform AI replies when the service window is closed and can flag conversations that are close to expiring.'
        ]
      },
      {
        title: 'Recommended operating pattern',
        body: [
          'Monitor expiring conversations, hand off early when context is sensitive, and keep approved fallback templates ready.',
          'Train operators to read window status before sending any outbound reply that assumes freeform messaging is still allowed.'
        ]
      }
    ]
  }
];

export const docsNavGroups = [
  {
    title: 'Overview',
    links: [
      {
        href: '/docs',
        title: 'Documentation home',
        description: 'Quick entry points for setup and WhatsApp operations.'
      }
    ]
  },
  {
    title: 'Getting started',
    links: docsPages
      .filter((page) => page.category === 'Getting started')
      .map(({ href, title, description }) => ({ href, title, description }))
  },
  {
    title: 'WhatsApp operations',
    links: docsPages
      .filter((page) => page.category === 'WhatsApp operations')
      .map(({ href, title, description }) => ({ href, title, description }))
  }
] as const;

export function getDocPage(href: string) {
  const page = docsPages.find((entry) => entry.href === href);

  if (!page) {
    throw new Error(`Unknown docs page: ${href}`);
  }

  return page;
}
