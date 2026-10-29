// The PR's conversation: every reader can read and post (1..4000 characters).

import { useState } from "react";
import { fmtDateTime, initialsOf } from "./prDetail";

const MAX = 4000;

/** props: comments, busy, onPost(text) -> Promise<boolean> */
export default function PrConversation({ comments = [], busy, onPost }) {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const tooLong = text.length > MAX;

  const post = async () => {
    if (!trimmed || tooLong) return;
    const ok = await onPost(trimmed);
    if (ok) setText("");
  };

  return (
    <div className="section-card" data-testid="pr-conversation">
      <div className="section-head">
        <div className="h-left">
          <div>
            <h2>Conversation</h2>
            <div className="h-sub">Everyone who can see this PR can read and reply</div>
          </div>
        </div>
      </div>
      <div className="section-body">
        {comments.length === 0 && <div style={{ fontSize: 12.5, color: "var(--fg-4)" }}>No comments yet.</div>}
        {comments.map((c) => (
          <div key={c.id} className="activity-item">
            <div className="ai-ic">{initialsOf(c.author_name)}</div>
            <div className="ai-body">
              <div className="ai-text"><span className="em">{c.author_name || "Someone"}</span></div>
              <div style={{ fontSize: 13, color: "var(--fg-2)", whiteSpace: "pre-wrap", marginTop: 3, lineHeight: 1.5 }}>{c.body}</div>
            </div>
            <div className="ai-time">{fmtDateTime(c.created_at)}</div>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <textarea className="textarea" aria-label="Write a comment" placeholder="Ask a question or add context…" value={text}
            onChange={(e) => setText(e.target.value)} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span className="fs-11" style={{ color: tooLong ? "var(--danger)" : "var(--fg-4)" }}>{text.length}/{MAX}</span>
            <button type="button" className="btn btn-blue btn-sm" disabled={busy || !trimmed || tooLong} onClick={post}>Post comment</button>
          </div>
        </div>
      </div>
    </div>
  );
}
