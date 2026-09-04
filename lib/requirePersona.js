import { COOKIE_NAME, readSessionToken } from "@/lib/session";
import { peopleById } from "@/data/ihg/org";

/**
 * getServerSideProps wrapper for every page behind the gate. Resolves the
 * signed-in persona server-side so the shell renders with a name already in
 * it — no /me round-trip, no flash of an empty avatar.
 *
 * middleware.js already blocks unauthenticated requests; the redirect here is
 * the belt to its braces, and covers the case of a cookie signed with a
 * secret that has since been rotated.
 */
export const requirePersona = (getProps) => async (ctx) => {
  const session = await readSessionToken(ctx.req.cookies?.[COOKIE_NAME]);
  const persona = session ? peopleById[session.personaId] : null;

  if (!persona) {
    return {
      redirect: {
        destination: `/?next=${encodeURIComponent(ctx.resolvedUrl || "/dashboard")}`,
        permanent: false,
      },
    };
  }

  const extra = getProps ? await getProps(ctx, persona) : { props: {} };
  return { ...extra, props: { persona, ...(extra.props || {}) } };
};

export default requirePersona;
