export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_URL || process.env.CLERK_ISSUES_URL,
      applicationID: "convex",
    },
  ],
};
