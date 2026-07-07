export const CASHFREE_MODE = 
  process.env.NEXT_PUBLIC_CASHFREE_MODE === "production" 
    ? "production" as const
    : "sandbox" as const;

export const IS_PRODUCTION = CASHFREE_MODE === "production";
