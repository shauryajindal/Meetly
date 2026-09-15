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
  if (socket.connected) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject)=> {
    socket.once("connect", () => {
      resolve()
    })

    socket.once("connect_error", (error) => {
      reject(error)
    });
      console.log("SOCKET TOKEN EXISTS:", !!getAccessToken());
    socket.connect()
  })
}

export default socket

window.socket = socket
