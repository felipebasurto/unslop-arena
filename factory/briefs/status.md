Build the public status page for Relay, an API infrastructure company. Their API endpoint is api.relay.dev.

It should show:

- A big overall status banner: "All systems operational" in green (or a partial-outage variant).
- A components list: API Gateway, Dashboard, Webhooks, Status Page itself, plus 2 regional endpoints — each with status (Operational / Degraded / Outage) and a 90-day uptime bar (90 small day-cells, mostly green with one amber).
- An "Active incidents" section: one resolved incident from last week (title, duration, timeline of updates) and the section showing "No active incidents" state if that's cleaner.
- A "Scheduled maintenance" notice for next Tuesday.
- Footer: subscribe-to-updates email field and links.

Mock data inline. No external services.

Polished, professional, ready to ship. Everything in English.
