import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// GitHub Pages project site: https://<owner>.github.io/<repo>/
const GITHUB_OWNER = "Abhinav5050649";
const GITHUB_REPO = "mail-rocket";
const REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`;

const config: Config = {
  title: "Mail Rocket",
  tagline: "Self-hosted email campaigns, sent through your own AWS SES account.",
  // SVG for browsers that take it; the PNGs in headTags below cover Safari,
  // iOS home screens and crawlers that ignore SVG icons.
  favicon: "img/logo.svg",
  headTags: [
    { tagName: "link", attributes: { rel: "icon", type: "image/png", sizes: "32x32", href: `/${GITHUB_REPO}/img/favicon-32.png` } },
    { tagName: "link", attributes: { rel: "icon", type: "image/png", sizes: "192x192", href: `/${GITHUB_REPO}/img/favicon-192.png` } },
    { tagName: "link", attributes: { rel: "apple-touch-icon", sizes: "180x180", href: `/${GITHUB_REPO}/img/apple-touch-icon.png` } },
  ],

  url: `https://${GITHUB_OWNER.toLowerCase()}.github.io`,
  baseUrl: `/${GITHUB_REPO}/`,
  organizationName: GITHUB_OWNER,
  projectName: GITHUB_REPO,
  trailingSlash: false,

  onBrokenLinks: "throw",

  i18n: { defaultLocale: "en", locales: ["en"] },

  markdown: {
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: "throw" },
  },
  themes: ["@docusaurus/theme-mermaid"],

  stylesheets: [
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap",
  ],

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: `${REPO_URL}/tree/main/website/`,
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // og:image / twitter:image for link previews (Slack, X, WhatsApp...). 1200x630.
    image: "img/social-card.png",
    colorMode: { respectPrefersColorScheme: true },
    navbar: {
      title: "Mail Rocket",
      logo: { alt: "Mail Rocket", src: "img/logo.svg" },
      items: [
        { type: "docSidebar", sidebarId: "docs", position: "left", label: "Docs" },
        { to: "/docs/reference/api", label: "API", position: "left" },
        { href: REPO_URL, label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            { label: "Introduction", to: "/docs/intro" },
            { label: "Quickstart", to: "/docs/getting-started/quickstart" },
            { label: "Deploy to a server", to: "/docs/deployment/server" },
          ],
        },
        {
          title: "Reference",
          items: [
            { label: "API endpoints", to: "/docs/reference/api" },
            { label: "Configuration", to: "/docs/reference/configuration" },
            { label: "Architecture", to: "/docs/reference/architecture" },
          ],
        },
        {
          title: "Project",
          items: [
            { label: "GitHub", href: REPO_URL },
            { label: "FAQ", to: "/docs/faq" },
            { label: "Issues", href: `${REPO_URL}/issues` },
          ],
        },
      ],
      copyright: `Mail Rocket. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json"],
    },
    mermaid: { theme: { light: "neutral", dark: "dark" } },
  } satisfies Preset.ThemeConfig,
};

export default config;
