export type ReplyRow = {
  id: number;
  post_id: number;
  parent_reply_id: number | null;
  author_id: number;
  display_name: string;
  body: string;
  created_at: string;
  score: number;
  user_vote: number | null;
  attachments: { id: number; mime_type: string }[];
};

export type ReplyNode = ReplyRow & { children: ReplyNode[] };

export function buildReplyTree(rows: ReplyRow[]): ReplyNode[] {
  const byId = new Map<number, ReplyNode>();
  for (const r of rows) {
    byId.set(r.id, { ...r, children: [] });
  }
  const roots: ReplyNode[] = [];
  for (const node of byId.values()) {
    const pid = node.parent_reply_id;
    if (pid == null) {
      roots.push(node);
    } else {
      const parent = byId.get(pid);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }
  const sortRecursive = (list: ReplyNode[]) => {
    list.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    for (const n of list) sortRecursive(n.children);
  };
  sortRecursive(roots);
  return roots;
}
