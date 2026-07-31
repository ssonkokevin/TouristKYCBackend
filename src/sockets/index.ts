import { Server } from "socket.io";

export const io = new Server({
  cors: { origin: "*" },
});

export function emitSubscriberRegistered(subscriber: any) {
  io.emit("subscriber:registered", subscriber);
}

export function emitSubscriberSuspended(subscriber: any) {
  io.emit("subscriber:suspended", subscriber);
}

export function emitSubscriberDeregistered(subscriber: any) {
  io.emit("subscriber:deregistered", subscriber);
}

export function emitSimActivated(payload: any) {
  io.emit("sim:activated", payload);
}

export function emitNotification(notification: any) {
  io.emit("notification:new", notification);
}
