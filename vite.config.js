import { defineConfig } from "vite";
import { attachRoomServer } from "./server/rooms.js";

// The co-op relay lives on the same HTTP server as the client, so invite links
// and WebSocket URLs work unchanged in development and production.
function coopRooms() {
  return {
    name: "mindwar-coop-rooms",
    configureServer(server) {
      if (!server.httpServer) return;
      attachRoomServer(server.httpServer);
    }
  };
}

export default defineConfig({
  plugins: [coopRooms()],
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
