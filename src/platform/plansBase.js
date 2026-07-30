/**
 * The Plans pages are shared verbatim by both portals — a Super Admin manages
 * the platform's **global** plans (sold to resellers), a Reseller manages
 * **their own** (sold to their client workspaces). The API returns the right
 * set automatically based on the caller's role, so the only thing that differs
 * client-side is the URL prefix to navigate within.
 *
 * Derived from the current pathname rather than threaded through as a prop, so
 * the same component works under both route trees with no wrapper.
 */
export const plansBase = (pathname) =>
  pathname.startsWith('/platform/admin') ? '/platform/admin/plans' : '/platform/reseller/plans';

/** Copy that differs between the two portals — the fields and behaviour don't. */
export const plansCopy = (pathname) =>
  pathname.startsWith('/platform/admin')
    ? {
        subtitle: 'Platform plans you sell to resellers. Every reseller is subscribed to one of these.',
        emptyDescription:
          "Create your first platform plan — resellers pick one when they're created or when they sign up.",
        comparisonTitle: 'Platform plan comparison',
      }
    : {
        subtitle: 'Create and manage subscription plans.',
        emptyDescription:
          "Create your first subscription plan — it'll show up here and on the comparison cards below.",
        comparisonTitle: 'Plan comparison',
      };
