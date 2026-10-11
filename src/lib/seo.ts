import { useEffect } from "react";

interface SeoInput {
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  keywords?: string;
  schemas?: unknown[];
}

const setMeta = (selector: string, attr: string, key: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
};

export const useSeo = ({ title, description, keywords, schemas }: SeoInput) => {
  useEffect(() => {
    document.title = title;
    if (description) setMeta('meta[name="description"]', "name", "description", description);
    if (keywords) setMeta('meta[name="keywords"]', "name", "keywords", keywords);
    const injected: HTMLScriptElement[] = [];
    for (const schema of schemas || []) {
      if (!schema) continue;
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.textContent = JSON.stringify(schema);
      document.head.appendChild(s);
      injected.push(s);
    }
    return () => injected.forEach((s) => s.remove());
  }, [title, description, keywords, schemas]);
};

export const getBOQServiceSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Benna BOQ Builder",
  description: "Free shoppable Bill of Quantities builder for construction projects.",
});

export const getSpeakableSchema = (_path = "/") => null;
