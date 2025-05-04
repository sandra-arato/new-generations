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

/**
 * Content Generation Pipeline (IDO-12)
 *
 * - Loads Hungarian and English style samples from samples/hungarian/ and samples/english/.
 * - Extracts style/tone features (concatenates samples as a style prompt prefix).
 * - generateDrafts(options) accepts:
 *     - language: 'en' | 'hu' (default: 'en')
 *     - toneAdjustment?: string (optional, for user-requested tone changes)
 * - Prepends style prompt to LLM prompt for summary/intro generation.
 * - Saves drafts in drafts/{output}/ folders, using MJML for newsletter and platform-specific formats for others.
 */

function loadStyleSamples(language: 'en' | 'hu'): string {
  const dir = path.join(__dirname, 'samples', language === 'hu' ? 'hungarian' : 'english');
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => fs.readFileSync(path.join(dir, f), 'utf-8'))
    .join('\n\n');
}

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

async function generateDrafts({ language = 'en', toneAdjustment = '' }: { language?: 'en' | 'hu', toneAdjustment?: string } = {}) {
  const stylePrompt = loadStyleSamples(language) || '';
  const links = await fetchUncompiledLinks();
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR);

  // Generate summaries for each link
  const articles: { title: string; summary: string; image?: string; url: string }[] = [];
  for (const linkObj of links) {
    const prompt = `Style guide:\n${stylePrompt}\n${toneAdjustment ? `\nTone adjustment: ${toneAdjustment}` : ''}\nSummarize the following article for a newsletter. Give a title and a 2-3 sentence summary. If possible, suggest a relevant image URL.\n\nURL: ${linkObj.url}`;
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
    articles.push({
      title: titleMatch ? titleMatch[1].trim() : '',
      summary: summaryMatch ? summaryMatch[1].trim() : '',
      image: imageMatch ? imageMatch[1].trim() : undefined,
      url: linkObj.url
    });
  }

  // Compose intro and title using Anthropic
  const introPrompt = `Style guide:\n${stylePrompt}\n${toneAdjustment ? `\nTone adjustment: ${toneAdjustment}` : ''}\nYou are an expert newsletter writer. Write a catchy title and a short intro for a newsletter issue that features the following articles:\n${articles.map(a => `- ${a.title}: ${a.summary}`).join('\n')}`;
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
  const title = titleMatch ? titleMatch[1].trim() : (language === 'hu' ? 'Hírlevél' : 'Newsletter');
  const intro = introMatch ? introMatch[1].trim() : introText.trim();

  // Output folders
  const out = (sub: string) => path.join(DRAFTS_DIR, sub);
  if (!fs.existsSync(out('newsletter'))) fs.mkdirSync(out('newsletter'), { recursive: true });
  if (!fs.existsSync(out('medium'))) fs.mkdirSync(out('medium'), { recursive: true });
  if (!fs.existsSync(out('substack'))) fs.mkdirSync(out('substack'), { recursive: true });
  if (!fs.existsSync(out('linkedin'))) fs.mkdirSync(out('linkedin'), { recursive: true });

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
  fs.writeFileSync(path.join(out('newsletter'), `${language === 'hu' ? 'hirlevel' : 'newsletter'}-email.html`), emailHtml);

  // 2. Medium
  const mediumDraft = renderMediumPost({ title, intro, articles });
  fs.writeFileSync(path.join(out('medium'), `${language === 'hu' ? 'kozepes-cikk' : 'medium-post'}.md`), mediumDraft);

  // 3. Substack
  const substackDraft = renderSubstackPost({ title, intro, articles });
  fs.writeFileSync(path.join(out('substack'), `${language === 'hu' ? 'substack-hu' : 'substack-post'}.md`), substackDraft);

  // 4. LinkedIn
  const linkedinDraft = renderLinkedinNewsletter({ title, intro, articles });
  fs.writeFileSync(path.join(out('linkedin'), `${language === 'hu' ? 'linkedin-hu' : 'linkedin-newsletter'}.md`), linkedinDraft);

  console.log(`Drafts generated in /drafts/{output}/ for language: ${language}. Review and approve before publishing.`);
}

if (require.main === module) {
  generateDrafts().catch(console.error);
} 