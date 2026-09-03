import { absoluteUrl, siteRoutes } from "../data/seo";

export default function sitemap() {
  return siteRoutes.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: route.lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
