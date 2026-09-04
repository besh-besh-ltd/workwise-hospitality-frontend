import { clearedCookie } from "@/lib/session";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearedCookie());
  return res.status(200).json({ ok: true });
}
