import { ChevronDown } from "lucide-react";
import type { CrmKnowledgeArticle } from "@/lib/services/crm-bridge";

export function FaqList({ articles }: { articles: CrmKnowledgeArticle[] }) {
  if (articles.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No help articles are published yet.</p>;
  }

  const byCategory = new Map<string, CrmKnowledgeArticle[]>();
  for (const article of articles) {
    const list = byCategory.get(article.category) ?? [];
    list.push(article);
    byCategory.set(article.category, list);
  }

  return (
    <div className="space-y-6">
      {[...byCategory.entries()].map(([category, items]) => (
        <div key={category} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{category}</h2>
          <div className="divide-y divide-border rounded-lg border border-border">
            {items.map((article) => (
              <details key={article.id} className="group p-4 open:pb-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                  {article.title}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{article.body}</p>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
