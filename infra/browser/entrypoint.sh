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

# Fail closed: any rule that cannot be installed aborts startup (set -e),
# so the browser never runs with a partial firewall.
iptables -F OUTPUT
# Replies to the app's inbound control connection (ws) and to allowed flows.
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
# Docker's embedded DNS resolver.
iptables -A OUTPUT -d 127.0.0.11/32 -j ACCEPT
for cidr in $BLOCKED_V4; do
  iptables -A OUTPUT -d "$cidr" -j REJECT
done
# Optional exemptions for a proxy gateway on a private address. Only exact
# IPv4 host:port pairs are accepted — no CIDRs — so a typo or a broad range
# cannot re-open the private networks. Inserted before the REJECTs.
if [ -n "${EGRESS_ALLOW:-}" ]; then
  for entry in $EGRESS_ALLOW; do
    case "$entry" in
      *[!0-9.:]* | *:*:* | :* | *:) echo "Invalid EGRESS_ALLOW entry '$entry' (want IPv4:port)" >&2; exit 1 ;;
    esac
    host=${entry%:*}; port=${entry#*:}
    if ! echo "$host" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$' || [ "$port" -lt 1 ] || [ "$port" -gt 65535 ]; then
      echo "Invalid EGRESS_ALLOW entry '$entry' (want IPv4:port)" >&2; exit 1
    fi
    iptables -I OUTPUT 3 -p tcp -d "$host/32" --dport "$port" -j ACCEPT
  done
fi

# IPv6 is enforced unconditionally. (Probing with `ip6tables -L` first is
# unsafe: on the nft backend it fails until the table exists, which silently
# skipped every v6 rule — fail-open.)
ip6tables -F OUTPUT
ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
for cidr in $BLOCKED_V6; do
  ip6tables -A OUTPUT -d "$cidr" -j REJECT
done

# Self-check: refuse to start unless both rule sets are actually present.
v4_rejects=$(iptables -S OUTPUT | grep -c -- '-j REJECT' || true)
v6_rejects=$(ip6tables -S OUTPUT | grep -c -- '-j REJECT' || true)
if [ "$v4_rejects" -lt 15 ] || [ "$v6_rejects" -lt 12 ]; then
  echo "Egress firewall incomplete (v4=$v4_rejects v6=$v6_rejects REJECT rules) — refusing to start" >&2
  exit 1
fi

echo "Egress firewall active (v4 REJECT rules: $v4_rejects, v6: $v6_rejects):"
iptables -S OUTPUT
ip6tables -S OUTPUT

# Drop root (and with it CAP_NET_ADMIN) before starting the browser.
exec setpriv --reuid=pwuser --regid=pwuser --init-groups --inh-caps=-all --bounding-set=-all \
  node /srv/browser/server.js
