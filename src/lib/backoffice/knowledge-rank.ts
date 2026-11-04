export type KnowledgeSnippet = {
  slug: string;
  title: string;
  body: string;
  category: string;
  priority?: number;
};

export function rankKnowledge(articles: KnowledgeSnippet[], query: string, limit = 4): KnowledgeSnippet[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
  if (terms.length === 0) return [];
  return articles
    .map((article) => {
      const haystack = `${article.title} ${article.body} ${article.category}`.toLowerCase();
      const score = terms.reduce((sum, word) => sum + (haystack.includes(word) ? 1 : 0), 0);
      return { article, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || (b.article.priority ?? 0) - (a.article.priority ?? 0))
    .slice(0, limit)
    .map((item) => item.article);
}
