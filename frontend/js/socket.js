import { getAccessToken } from "./auth.js"

const socket = io((CONFIG.SOCKET_URL), {
    autoConnect: false,
    auth: {
        token: getAccessToken()
    }
});

socket.on("connect", () => {
  console.log("Socket connected:",socket.id)
})

socket.on("disconnect", () => {
  console.log("Socket disconnected")
})

socket.on("connect_error", (error) => {
  console.error("Socket connection error:",error.message)
})

export function connectSocket() {
  console.log("CONNECT SOCKET CALLED");

  if (socket.connected) {
    console.log("SOCKET ALREADY CONNECTED");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {

    socket.once("connect", () => {
      console.log("SOCKET CONNECTED:", socket.id);
      resolve();
    });

    socket.once("connect_error", (error) => {
      console.error("SOCKET CONNECT ERROR:", error.message);
      reject(error);
    });

    console.log("ABOUT TO CALL SOCKET.CONNECT");
    console.log("SOCKET TOKEN EXISTS:", !!getAccessToken());

    socket.connect();

    console.log("SOCKET.CONNECT CALLED");
  });
}

export default socket

window.socket = socket
