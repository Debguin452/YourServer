# Using your own domain name

Free, no credit card, works with a domain from any registrar.

1. Add the domain to your Cloudflare account (Cloudflare dashboard →
   **Add a domain**) and switch its nameservers to the two Cloudflare
   gives you (done at your domain registrar — Namecheap, GoDaddy,
   etc.).
2. Once Cloudflare shows the domain as active: Workers & Pages → your
   Worker → **Settings → Triggers → Custom Domains → Add Custom
   Domain**.
3. Type the (sub)domain you want, e.g. `api.example.com`. Cloudflare
   issues the SSL certificate automatically — nothing else to
   configure.

Your server now answers at `https://api.example.com` in addition to
the `*.workers.dev` URL, at no extra cost.
