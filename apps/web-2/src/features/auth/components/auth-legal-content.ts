export type LegalDocumentType = 'terms' | 'privacy';

type LegalSection = {
  title: string;
  body: string[];
};

type LegalDocument = {
  label: string;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
  footer: string;
};

export const legalDocuments: Record<LegalDocumentType, LegalDocument> = {
  terms: {
    label: 'Terms of Service',
    title: 'Wabrix Terms of Service',
    summary:
      'These terms govern access to Wabrix for WhatsApp automation, inbox operations, bot configuration, and knowledge-driven replies.',
    updatedAt: 'April 28, 2026',
    sections: [
      {
        title: 'Service Scope',
        body: [
          'Wabrix helps teams manage WhatsApp conversations, bot behavior, knowledge sources, message templates, and workspace operations from a shared dashboard.',
          'You may use the service only for lawful business messaging and only within the permissions, channels, and environments configured for your workspace.'
        ]
      },
      {
        title: 'Customer Consent and Messaging Rules',
        body: [
          'You are responsible for collecting any customer consent required for WhatsApp messaging, storing valid contact details, and following the WhatsApp Business Platform and Meta platform policies that apply to your use case.',
          'You must not use Wabrix to send spam, misleading automations, prohibited content, or messages that violate recipient opt-in, region-specific privacy rules, or industry restrictions.'
        ]
      },
      {
        title: 'Templates and Service Windows',
        body: [
          'When the customer service window is closed, outbound messaging must use an approved WhatsApp template. Wabrix may expose template tools, but compliance, submission quality, and production usage remain your responsibility.',
          'If Meta limits, rejects, or blocks a template, phone number, or business account, Wabrix is not responsible for the operational impact of that external platform decision.'
        ]
      },
      {
        title: 'Workspace Data and AI Processing',
        body: [
          'Messages, contacts, uploaded knowledge sources, and bot prompts may be processed to generate replies, power search, detect workflow state, or sync conversations across connected services.',
          'You should not upload unlawful content or any material you do not have the right to store, process, summarize, or send to downstream providers used by your deployment.'
        ]
      },
      {
        title: 'Availability, Security, and Suspension',
        body: [
          'Keep your workspace credentials, access tokens, and integration secrets protected. Activity performed through your workspace is treated as authorized by your team unless reported otherwise.',
          'We may restrict access, pause integrations, or remove abusive content when needed to protect the service, other tenants, provider relationships, or policy compliance.'
        ]
      }
    ],
    footer:
      'Continuing to use Wabrix after updated terms are published means your workspace accepts those changes.'
  },
  privacy: {
    label: 'Privacy Policy',
    title: 'Wabrix Privacy Policy',
    summary:
      'This policy explains how Wabrix handles account, conversation, and integration data used to run WhatsApp chatbot workflows.',
    updatedAt: 'April 28, 2026',
    sections: [
      {
        title: 'Data We Collect',
        body: [
          'Wabrix stores workspace account details, organization membership, integration identifiers, WhatsApp configuration values, conversation records, contacts, internal notes, and knowledge sources that your team provides.',
          'Usage telemetry such as sync attempts, mutation outcomes, delivery state, and operational logs may also be recorded to keep the product working reliably.'
        ]
      },
      {
        title: 'How We Use Data',
        body: [
          'We use this information to authenticate users, render inbox and dashboard views, send or receive WhatsApp messages, configure bots, retrieve knowledge, and generate assistant responses requested by your workspace.',
          'Some content may be analyzed to classify conversations, evaluate service-window state, or prepare AI-assisted drafts and previews.'
        ]
      },
      {
        title: 'Processors and Integrations',
        body: [
          'Depending on your deployment, Wabrix may rely on infrastructure and service providers such as Clerk for authentication, Convex for application data, AI/model providers for bot responses, and Meta or WhatsApp providers for message delivery and lifecycle events.',
          'Those providers process only the data needed to deliver the feature you actively use, under their own service terms and privacy commitments.'
        ]
      },
      {
        title: 'Retention and Security',
        body: [
          'Workspace data is retained for operational continuity, auditability, and conversation history unless your organization deletes it or your deployment applies a different retention rule.',
          'We use reasonable technical and organizational measures to protect stored data, but you remain responsible for limiting sensitive content and securing admin access inside your team.'
        ]
      },
      {
        title: 'Your Choices and Responsibilities',
        body: [
          'You can update contact records, remove knowledge sources, rotate integration credentials, and control who has workspace access through your organization settings.',
          'If your workspace processes regulated or highly sensitive information, you are responsible for verifying that your deployment, provider choices, and business process meet the obligations that apply to you.'
        ]
      }
    ],
    footer:
      'For privacy or data-handling questions, use the support channel or workspace administrator configured for your Wabrix deployment.'
  }
};
