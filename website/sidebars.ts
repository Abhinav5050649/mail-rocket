import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    "intro",
    {
      type: "category",
      label: "Getting started",
      collapsed: false,
      items: ["getting-started/quickstart", "getting-started/docker"],
    },
    {
      type: "category",
      label: "Guides",
      collapsed: false,
      items: [
        "guides/api-keys",
        "guides/identities",
        "guides/campaigns",
        "guides/templates",
        "guides/tracking-and-unsubscribe",
      ],
    },
    {
      type: "category",
      label: "Deployment",
      items: ["deployment/server", "deployment/aws-ses"],
    },
    {
      type: "category",
      label: "Reference",
      items: ["reference/api", "reference/configuration", "reference/architecture"],
    },
    "faq",
  ],
};

export default sidebars;
