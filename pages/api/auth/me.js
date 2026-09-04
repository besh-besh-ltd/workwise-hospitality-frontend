import { COOKIE_NAME, readSessionToken } from "@/lib/session";
import { peopleById } from "@/data/ihg/org";

/** Who am I? Used by the shell to render the signed-in persona. */
export default async function handler(req, res) {
  const token = req.cookies?.[COOKIE_NAME];
  const session = await readSessionToken(token);
  const persona = session ? peopleById[session.personaId] : null;
  if (!persona) return res.status(401).json({ error: "Not signed in" });
  return res.status(200).json({ persona });
}
