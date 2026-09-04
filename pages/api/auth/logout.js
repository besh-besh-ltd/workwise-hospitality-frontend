import { clearedCookie, isSecureRequest } from "@/lib/session";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearedCookie(isSecureRequest(req)));
  return res.status(200).json({ ok: true });
}
