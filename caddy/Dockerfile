# Custom Caddy build with the Cloudflare DNS provider plugin baked in.
# Needed for ACME DNS-01 challenge — lets LE renewals work even when the
# domain is behind Cloudflare's orange-cloud proxy (HTTP-01 would hit the
# Cloudflare edge instead of our Caddy).
FROM caddy:2-builder-alpine AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
