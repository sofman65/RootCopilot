import { query } from "./_generated/server";

export const getIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { error: "Not authenticated" };
    }
    
    // Return all claims for debugging
    return {
      subject: identity.subject,
      issuer: identity.issuer,
      tokenIdentifier: identity.tokenIdentifier,
      // All other claims
      allClaims: Object.fromEntries(
        Object.entries(identity).filter(
          ([key]) => !["subject", "issuer", "tokenIdentifier"].includes(key)
        )
      ),
    };
  },
});

