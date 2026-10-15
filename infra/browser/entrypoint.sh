#!/bin/sh
# Egress firewall for the browser container — the actual SSRF boundary.
# Enforced by the kernel on every connection *after* DNS resolution, so it
# also covers HTTP 3xx redirect hops and DNS rebinding, which the in-app
# guard cannot see. Ranges mirror BLOCKED_IPV4_CIDRS in url-policy.ts.
set -eu

BLOCKED_V4="0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 \
192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 \
203.0.113.0/24 224.0.0.0/4 240.0.0.0/4"
BLOCKED_V6="::/128 ::1/128 ::/96 ::ffff:0:0/96 64:ff9b::/96 2001::/32 2001:db8::/32 2002::/16 \
fc00::/7 fe80::/10 fec0::/10 ff00::/8"

iptables -F OUTPUT
# Replies to the app's inbound control connection (ws) and to allowed flows.
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
# Docker's embedded DNS resolver.
iptables -A OUTPUT -d 127.0.0.11/32 -j ACCEPT
for cidr in $BLOCKED_V4; do
  iptables -A OUTPUT -d "$cidr" -j REJECT
done
# Optional explicit allow for an upstream proxy on a private address
# (e.g. a local proxy gateway). Inserted before the REJECTs.
if [ -n "${EGRESS_ALLOW_CIDRS:-}" ]; then
  for cidr in $EGRESS_ALLOW_CIDRS; do
    iptables -I OUTPUT 3 -d "$cidr" -j ACCEPT
  done
fi

if ip6tables -L OUTPUT >/dev/null 2>&1; then
  ip6tables -F OUTPUT
  ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  for cidr in $BLOCKED_V6; do
    ip6tables -A OUTPUT -d "$cidr" -j REJECT
  done
fi

echo "Egress firewall active:"
iptables -S OUTPUT

# Drop root (and with it CAP_NET_ADMIN) before starting the browser.
exec setpriv --reuid=pwuser --regid=pwuser --init-groups --inh-caps=-all --bounding-set=-all \
  node /srv/browser/server.js
