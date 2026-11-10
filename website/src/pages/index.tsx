import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import CodeBlock from "@theme/CodeBlock";
import styles from "./index.module.css";

const FEATURES: { title: string; body: string; to: string }[] = [
  {
    title: "Your SES, your data",
    body: "Mail goes out through your own AWS SES account. The database, the keys and the subscriber list stay on your server.",
    to: "/docs/deployment/aws-ses",
  },
  {
    title: "Scheduled campaigns",
    body: "Pick a verified identity, a template and an audience, set a start time. Sends fan out in rate-limited chunks that match your SES quota.",
    to: "/docs/guides/campaigns",
  },
  {
    title: "Templates with variables",
    body: "Write HTML with {{subscriber_first_name}}, {{group_name}} and more. A subscriber missing a value is skipped, never sent a broken email.",
    to: "/docs/guides/templates",
  },
  {
    title: "Opens, clicks, unsubscribes",
    body: "A tracking pixel, signed click links and one-click List-Unsubscribe headers. Per-campaign stats with honest counts.",
    to: "/docs/guides/tracking-and-unsubscribe",
  },
  {
    title: "API keys, not accounts",
    body: "Every request carries an API key. Viewer, editor and admin presets, or an exact list of action/subject claims.",
    to: "/docs/guides/api-keys",
  },
  {
    title: "One docker compose up",
    body: "Postgres, Redis, the API, the web app and Caddy for automatic HTTPS. One small server is enough.",
    to: "/docs/deployment/server",
  },
];

const QUICKSTART = `git clone https://github.com/Abhinav5050649/mail-rocket.git && cd mail-rocket
cp apps/api/example.env apps/api/.env      # add your AWS SES credentials
bun install
bun run stack && bun run db:migrate
docker compose logs api | grep "admin API key"  # sign in with it`;

function Hero(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={styles.hero}>
      <div className="container">
        <h1 className={styles.title}>{siteConfig.title}</h1>
        <p className={styles.tagline}>{siteConfig.tagline}</p>
        <p className={styles.sub}>
          Schedule campaigns, verify sending identities, write HTML templates and send to subscribers and groups,
          from a server you run.
        </p>
        <div className={styles.actions}>
          <Link className="button button--primary button--lg" to="/docs/getting-started/quickstart">
            Get started
          </Link>
          <Link className="button button--secondary button--outline button--lg" to="/docs/intro">
            Read the docs
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title="Self-hosted email campaigns" description={siteConfig.tagline}>
      <Hero />
      <main>
        <section className={styles.section}>
          <div className="container">
            <div className={styles.grid}>
              {FEATURES.map((f) => (
                <Link key={f.title} to={f.to} className={styles.card}>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={`container ${styles.split}`}>
            <div>
              <h2>Running in five commands</h2>
              <p>
                You need Bun, Docker and an AWS account with SES. The API prints an admin key on first boot; sign in to
                the web app with it.
              </p>
              <Link to="/docs/getting-started/docker">Full walkthrough →</Link>
            </div>
            <CodeBlock language="bash">{QUICKSTART}</CodeBlock>
          </div>
        </section>
      </main>
    </Layout>
  );
}
