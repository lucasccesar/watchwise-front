export interface CommentTreeNode<T> {
  comment: T;
  replies: CommentTreeNode<T>[];
}

export function buildCommentTree<T extends { id: string; parentCommentId: string | null }>(comments: readonly T[]): CommentTreeNode<T>[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, replies: [] as CommentTreeNode<T>[] }]));
  const roots: CommentTreeNode<T>[] = [];

  for (const comment of comments) {
    const node = nodes.get(comment.id);
    if (!node) continue;

    const parent = comment.parentCommentId ? nodes.get(comment.parentCommentId) : undefined;
    if (parent && parent !== node) parent.replies.push(node);
    else roots.push(node);
  }

  return roots;
}
