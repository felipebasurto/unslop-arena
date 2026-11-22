Build the API playground for Parcel, the shipping-API product (docs site companion page).

It should show:

- Left panel: endpoint list grouped by resource — Shipments (Create, Get, Cancel), Tracking (Events, ETA), Addresses (Validate) — each with method badge (GET green, POST blue, DELETE red) and path.
- Main area: request builder for "Create a shipment" — URL bar with method dropdown and endpoint path, headers table (Authorization, Content-Type rows), JSON body editor (textarea with plausible shipment JSON, syntax-colored if easy).
- "Send request" button and a response panel below showing a mock 201 JSON response with status, latency, and formatted body.
- Right or bottom: a short "Try it" hint list (3 tips) and rate-limit note.

Mock data inline — the response is fake/static. No external services.

Polished, professional, ready to ship. Dark or light developer-tool aesthetic — pick one and commit. Everything in English.
