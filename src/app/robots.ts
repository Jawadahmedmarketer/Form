export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/agreement/", "/admin", "/api/"] }],
  };
}
