import { Router, errorResponse } from "../lib/router.js";

/**
 * WebSocket echo server example (Workers support WebSockets natively,
 * free tier included). Connect with:
 *   wscat -c wss://<your-worker>/ws
 * and anything you type gets echoed back with a timestamp.
 *
 * Use this as the starting point for a chat room, a live dashboard
 * push, or a multiplayer game loop — the pattern is the same: accept
 * the socket, listen for "message", call send() whenever you want to
 * push data to that client.
 */
const router = new Router();

router.get("/", ({ request }) => {
  const upgradeHeader = request.headers.get("Upgrade");
  if (upgradeHeader !== "websocket") {
    return errorResponse("Expected a WebSocket upgrade request", 426);
  }

  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);

  server.accept();
  server.addEventListener("message", (event) => {
    server.send(JSON.stringify({ echo: event.data, at: new Date().toISOString() }));
  });
  server.addEventListener("close", () => {
    console.log("WebSocket closed");
  });

  return new Response(null, { status: 101, webSocket: client });
});

export default router;
