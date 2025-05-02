export function renderMediumPost({ title, intro, articles }: { title: string, intro: string, articles: any[] }) {
  return `# ${title}\n\n${intro}\n\n${articles.map(article => `## ${article.title}\n\n${article.summary}\n\n[Read more](${article.url})`).join('\n\n')}\n`;
} 