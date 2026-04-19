export default {
  providers: [
    {
      domain:
        process.env.CLERK_ISSUER_URL ?? "https://clerk-placeholder.invalid",
      applicationID: "convex",
    },
  ],
};
