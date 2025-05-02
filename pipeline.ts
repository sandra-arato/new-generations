import 'dotenv/config';
import { Anthropic } from 'anthropic';
// @ts-ignore
import mjml2html from 'mjml';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { renderMediumPost } from './templates/medium-post';
import { renderSubstackPost } from './templates/substack-post';
import { renderLinkedinNewsletter } from './templates/linkedin-newsletter';

const DRAFTS_DIR = path.join(__dirname, 'drafts');
const NEWSLETTER_TEMPLATE_PATH = path.join(__dirname, 'templates/newsletter.mjml');
const MCP_SERVER = 'http://localhost:3001';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchUncompiledLinks() {
  const res = await axios.get(`${MCP_SERVER}/uncompiled-links`);
  return res.data;
}

async function generateSummary(link: string): Promise<{ title: string, summary: string, image?: string }> {
  const prompt = `Summarize the following article for a newsletter. Give a title and a 2-3 sentence summary. If possible, suggest a relevant image URL.\n\nURL: ${link}`;
  const completion = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 512,
    messages: [
      { role: 'user', content: prompt }
    ]
  });
  const text = completion.content[0].text || '';
  const titleMatch = text.match(/Title:\s*(.*)/i);
  const summaryMatch = text.match(/Summary:\s*([\s\S]*?)(?:Image:|$)/i);
  const imageMatch = text.match(/Image:\s*(.*)/i);
  return {
    title: titleMatch ? titleMatch[1].trim() : '',
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    image: imageMatch ? imageMatch[1].trim() : undefined,
  };
}

async function generateDrafts() {
  const links = await fetchUncompiledLinks();
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR);

  // Generate summaries for each link
  const articles = [];
  for (const linkObj of links) {
    const meta = await generateSummary(linkObj.url);
    articles.push({ ...meta, url: linkObj.url });
  }

  // Compose intro and title using Anthropic
  const introPrompt = `You are an expert newsletter writer. Write a catchy title and a short intro for a newsletter issue that features the following articles:\n${articles.map(a => `- ${a.title}: ${a.summary}`).join('\n')}`;
  const introCompletion = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 512,
    messages: [
      { role: 'user', content: introPrompt }
    ]
  });
  const introText = introCompletion.content[0].text || '';
  const titleMatch = introText.match(/Title:\s*(.*)/i);
  const introMatch = introText.match(/Intro:\s*([\s\S]*)/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Newsletter';
  const intro = introMatch ? introMatch[1].trim() : introText.trim();

  // Generate drafts for each platform
  // 1. Email (MJML)
  const mjmlTemplate = fs.readFileSync(NEWSLETTER_TEMPLATE_PATH, 'utf-8');
  let mjmlContent = mjmlTemplate
    .replace('{{title}}', title)
    .replace('{{intro}}', intro)
    .replace('{{#each articles}}', '')
    .replace('{{/each}}', '');
  let articlesHtml = '';
  for (const article of articles) {
    articlesHtml += `\n<mj-section>\n  <mj-column>\n    <mj-image src="${article.image || ''}" alt="${article.title}" />\n    <mj-text font-size="18px" font-weight="bold">${article.title}</mj-text>\n    <mj-text>${article.summary}</mj-text>\n    <mj-button href="${article.url}">Read more</mj-button>\n  </mj-column>\n</mj-section>\n`;
  }
  mjmlContent = mjmlContent.replace(/(\{\{articlesHtml\}\})?/, articlesHtml);
  const { html: emailHtml } = mjml2html(mjmlContent);
  fs.writeFileSync(path.join(DRAFTS_DIR, 'newsletter-email.html'), emailHtml);

  // 2. Medium
  const mediumDraft = renderMediumPost({ title, intro, articles });
  fs.writeFileSync(path.join(DRAFTS_DIR, 'medium-post.md'), mediumDraft);

  // 3. Substack
  const substackDraft = renderSubstackPost({ title, intro, articles });
  fs.writeFileSync(path.join(DRAFTS_DIR, 'substack-post.md'), substackDraft);

  // 4. LinkedIn
  const linkedinDraft = renderLinkedinNewsletter({ title, intro, articles });
  fs.writeFileSync(path.join(DRAFTS_DIR, 'linkedin-newsletter.md'), linkedinDraft);

  console.log('Drafts generated in /drafts. Review and approve before publishing.');
}

if (require.main === module) {
  generateDrafts().catch(console.error);
} 