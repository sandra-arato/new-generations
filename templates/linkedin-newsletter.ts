export function renderLinkedinNewsletter({ title, intro, articles }: { title: string, intro: string, articles: any[] }) {
  return `## ${title}\n\n${intro}\n\n${articles.map(article => `**${article.title}**\n${article.summary}\n[Read more here](${article.url})`).join('\n\n')}\n`;
} 