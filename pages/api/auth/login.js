import { peopleById } from "@/data/ihg/org";
import { createSessionToken, sessionCookie } from "@/lib/session";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Picking a persona IS the sign-in. There is no password: this is a demo
  // with no real data behind it, and a shared password on the shared link only
  // ever added a step for the person presenting it. The session cookie is still
  // signed and still gates every /dashboard route.
  const { personaId } = req.body || {};
  const persona = peopleById[personaId];

  if (!persona) {
    return res.status(400).json({ error: "Pick who you're signing in as." });
  }

  const token = await createSessionToken(persona.id);
  res.setHeader("Set-Cookie", sessionCookie(token));
  return res.status(200).json({ ok: true, personaId: persona.id });
}
