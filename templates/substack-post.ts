export function renderSubstackPost({ title, intro, articles }: { title: string, intro: string, articles: any[] }) {
  return `# ${title}\n\n${intro}\n\n${articles.map(article => `### ${article.title}\n${article.summary}\n[Read more](${article.url})`).join('\n\n')}\n`;
} 