# Custom Caddy build with the Cloudflare DNS provider plugin baked in.
# Needed for ACME DNS-01 challenge — lets LE renewals work even when the
# domain is behind Cloudflare's orange-cloud proxy (HTTP-01 would hit the
# Cloudflare edge instead of our Caddy).
FROM caddy:2-builder-alpine AS builder

# Modules baked in:
#   caddy-dns/cloudflare      — DNS-01 ACME challenge (works behind orange cloud)
#   mholt/caddy-ratelimit     — rate_limit directive for /login /signup /api/*
#   WeidiDeng/caddy-cloudflare-ip — trusted_proxies cloudflare source (pulls CF
#                                   IP ranges so {client_ip} returns the real
#                                   client, not a CF anycast IP)
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/mholt/caddy-ratelimit \
    --with github.com/WeidiDeng/caddy-cloudflare-ip

FROM caddy:2-alpine
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
