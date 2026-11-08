"""
Minimal Python Worker example — same free Cloudflare tier as the main
JavaScript project, no credit card, just a different language.

Cloudflare's Python Workers run via Pyodide inside workerd (the same
runtime JS Workers use), so this has the same "never sleeps" behavior
as the rest of this kit. See ../../README.md for the fuller
JS-vs-Python tradeoffs.
"""
import json
from workers import Response


async def on_fetch(request, env, ctx):
    url = request.url
    path = url.split("://", 1)[-1].split("/", 1)[-1]
    path = "/" + path if not path.startswith("/") else path

    if path == "/" or path == "":
        body = {
            "ok": True,
            "message": "yourserver (Python) is running on Cloudflare Workers.",
            "try": ["/health"],
        }
    elif path == "/health":
        body = {"ok": True}
    else:
        return Response(json.dumps({"error": "Not Found"}), status=404)

    return Response(json.dumps(body), headers={"content-type": "application/json"})
