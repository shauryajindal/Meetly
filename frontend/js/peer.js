import socket from "./socket.js";
import { getLocalStream } from "./media.js";

const peerConnections = new Map();
const pendingCandidates = new Map();
const screenPeerConnections = new Map();
const pendingScreenCandidates = new Map();


const ICE_CONFIG = {
    iceServers: [
        {
            urls: "stun:stun.l.google.com:19302"
        }
    ]
};

function createPeerConnection(remoteSocketId) {
    console.log("CREATING PEER CONNECTION FOR:", remoteSocketId);

  const peerConnection = new RTCPeerConnection(ICE_CONFIG);


    const localStream = getLocalStream();

    if (!localStream) {
        throw new Error("Local media is not ready");
    }

    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        console.log("REMOTE TRACK RECEIVED FROM:", remoteSocketId);
        console.log("TRACK KIND:", event.track.kind);
        console.log("REMOTE STREAM:", event.streams[0]);
        console.log("REMOTE STREAM TRACKS:", event.streams[0]?.getTracks().map(
            (track) => ({
                kind: track.kind,
                enabled: track.enabled,
                readyState: track.readyState,
            })
        ));
    
        window.dispatchEvent(
            new CustomEvent("remote-stream", {
                detail: {
                    remoteSocketId,
                    stream: event.streams[0],
                },
            })
        );
    };

    peerConnection.onicecandidate = (event) => {
        if (!event.candidate) return;

        socket.emit("webrtc-ice-candidate", {
            candidate: event.candidate,
            targetSocketId: remoteSocketId,
        });
    };

    peerConnection.onconnectionstatechange = () => {
        console.log(
            "CONNECTION STATE:",
            remoteSocketId,
            peerConnection.connectionState
        );
        if (
            peerConnection.connectionState === "failed" ||
            peerConnection.connectionState === "closed"
        ) {
            removePeer(remoteSocketId);
        
            window.dispatchEvent(
                new CustomEvent("remote-user-left", {
                    detail: {
                        remoteSocketId,
                    },
                })
            );
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        console.log(
            "ICE CONNECTION STATE:",
            remoteSocketId,
            peerConnection.iceConnectionState
        );
    };

    peerConnections.set(remoteSocketId, peerConnection);
    pendingCandidates.set(remoteSocketId, []);

    return peerConnection;
}

function createScreenPeerConnection(remoteSocketId, screenStream) {
  console.log(
    "CREATING SCREEN PEER CONNECTION FOR:",
    remoteSocketId
  );

  const peerConnection = new RTCPeerConnection();

  const screenTrack = screenStream.getVideoTracks()[0];

  if (!screenTrack) {
    throw new Error("Screen video track not found");
  }

  peerConnection.addTrack(screenTrack, screenStream);

  peerConnection.onicecandidate = (event) => {
    if (!event.candidate) return;

    socket.emit("webrtc-ice-candidate", {
      candidate: event.candidate,
      targetSocketId: remoteSocketId,
      mediaType: "screen"
    });
  };

  peerConnection.onconnectionstatechange = () => {
    console.log(
      "SCREEN CONNECTION STATE:",
      remoteSocketId,
      peerConnection.connectionState
    );
  };

  screenPeerConnections.set(remoteSocketId, peerConnection);

  pendingScreenCandidates.set(remoteSocketId, []);
  
  return peerConnection;
}

function getPeerConnection(remoteSocketId) {
    if (peerConnections.has(remoteSocketId)) {
        return peerConnections.get(remoteSocketId);
    }

    return createPeerConnection(remoteSocketId);
}

export async function createOffer(remoteSocketId, mediaType = "camera") {
    const peerConnection = getPeerConnection(remoteSocketId);

    console.log("PEER CONNECTION:", peerConnection);
    console.log(
        "SENDERS:",
        peerConnection.getSenders().map((sender) => sender.track?.kind)
    );

    const offer = await peerConnection.createOffer();

    await peerConnection.setLocalDescription(offer);

    socket.emit("webrtc-offer", {
        offer: peerConnection.localDescription,
      targetSocketId: remoteSocketId,
        mediaType
    });
}

export async function handleOffer(offer, remoteSocketId) {
    const peerConnection = getPeerConnection(remoteSocketId);

    await peerConnection.setRemoteDescription(offer);

    const answer = await peerConnection.createAnswer();

    await peerConnection.setLocalDescription(answer);

    socket.emit("webrtc-answer", {
        answer: peerConnection.localDescription,
        targetSocketId: remoteSocketId,
    });

    await addPendingCandidates(remoteSocketId);
}

export async function handleScreenOffer(offer, remoteSocketId) {
  let peerConnection = screenPeerConnections.get(remoteSocketId);

  if (!peerConnection) {
    peerConnection = new RTCPeerConnection();

    peerConnection.ontrack = (event) => {
      console.log("REMOTE SCREEN TRACK RECEIVED FROM:", remoteSocketId);
      console.log("SCREEN STREAM:", event.streams[0]);

      window.dispatchEvent(
        new CustomEvent("remote-screen-stream", {
          detail: {
            remoteSocketId,
            stream:event.streams[0]
          }
        })
      )
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
   
               socket.emit("webrtc-ice-candidate", {
                   candidate: event.candidate,
                   targetSocketId: remoteSocketId,
                   mediaType: "screen"
               });
    }
  }
  screenPeerConnections.set(remoteSocketId, peerConnection);
  await peerConnection.setRemoteDescription(offer);
  await addPendingScreenCandidates(remoteSocketId);

  const answer = await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(answer);
 
  socket.emit("webrtc-answer", {
      answer: peerConnection.localDescription,
      targetSocketId: remoteSocketId,
      mediaType: "screen"
  });

}

export async function handleAnswer(answer,remoteSocketId,mediaType = "camera") {
    let peerConnection;

    if (mediaType === "screen") {
        peerConnection = screenPeerConnections.get(remoteSocketId);
    } else {
        peerConnection = getPeerConnection(remoteSocketId);
    }

    if (!peerConnection) {
        console.error(
            "Peer connection not found:",
            remoteSocketId,
            mediaType
        );
        return;
    }

    await peerConnection.setRemoteDescription(answer);

    if (mediaType === "camera") {
        await addPendingCandidates(remoteSocketId);
    }
}

export async function handleIceCandidate(candidate,remoteSocketId,mediaType = "camera" ) {
    let peerConnection;
    let pendingCandidatesList;

    if (mediaType === "screen") {
        peerConnection = screenPeerConnections.get(remoteSocketId);
    
        if (!pendingScreenCandidates.has(remoteSocketId)) {
            pendingScreenCandidates.set(remoteSocketId, []);
        }
    
        pendingCandidatesList =
            pendingScreenCandidates.get(remoteSocketId);
    } else {
        peerConnection = getPeerConnection(remoteSocketId);
        pendingCandidatesList = pendingCandidates.get(remoteSocketId);
    }

    if (!peerConnection) {
        if (mediaType === "screen") {
            pendingCandidatesList.push(candidate);
    
            console.log(
                "SCREEN PEER NOT READY, QUEUING ICE:",
                remoteSocketId
            );
    
            return;
        }
    
        console.error(
            "Peer connection not found for ICE:",
            remoteSocketId,
            mediaType
        );
    
        return;
    }

    if (!peerConnection.remoteDescription) {
        pendingCandidatesList.push(candidate);

        console.log(
            "Remote description not ready, QUEUING ICE:",
            remoteSocketId,
            mediaType
        );

        return;
    }

    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error(
            "ERROR ADDING ICE CANDIDATE:",
            error
        );
    }
}

async function addPendingCandidates(remoteSocketId) {
    const peerConnection = getPeerConnection(remoteSocketId);
    const candidates = pendingCandidates.get(remoteSocketId);

    for (const candidate of candidates) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error(
                "ERROR ADDING QUEUED ICE CANDIDATE:",
                error
            );
        }
    }

    candidates.length = 0;
}

export function removePeer(remoteSocketId) {
    const peerConnection = peerConnections.get(remoteSocketId);

    if (peerConnection) {
        peerConnection.close();
    }

    peerConnections.delete(remoteSocketId);
    pendingCandidates.delete(remoteSocketId);
}

export function removeAllPeers() {
    for (const [remoteSocketId, peerConnection] of peerConnections) {
        console.log("CLOSING PEER:", remoteSocketId);
        peerConnection.close();
    }

    peerConnections.clear();
    pendingCandidates.clear();
}

export async function startScreenShareConnection(remoteSocketId, screenStream) {
  const peerConnection = createScreenPeerConnection(
    remoteSocketId,
    screenStream
  );

  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(offer);

  socket.emit("webrtc-offer", {
    offer: peerConnection.localDescription,
    targetSocketId: remoteSocketId,
    mediaType: "screen"
  });
}

async function addPendingScreenCandidates(remoteSocketId) {
    const peerConnection =
        screenPeerConnections.get(remoteSocketId);

    const candidates =
        pendingScreenCandidates.get(remoteSocketId);

    if (!peerConnection || !candidates) return;

    for (const candidate of candidates) {
        try {
            await peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error(
                "ERROR ADDING QUEUED SCREEN ICE CANDIDATE:",
                error
            );
        }
    }

    candidates.length = 0;
}

export function removeScreenPeer(remoteSocketId) {
    const peerConnection =
        screenPeerConnections.get(remoteSocketId);

    if (peerConnection) {
        peerConnection.close();
    }

    screenPeerConnections.delete(remoteSocketId);
    pendingScreenCandidates.delete(remoteSocketId);
}

export function removeAllScreenPeers() {
  for (const [remoteSocketId, pc] of screenPeerConnections) {
    console.log("CLOSING SCREEN PEER:", remoteSocketId);

    pc.close();
  }

  screenPeerConnections.clear();
  pendingScreenCandidates.clear();
}



window.debugPeers = () => {
    console.log(
        [...peerConnections.entries()].map(([socketId, pc]) => ({
            socketId,
            state: pc.connectionState,
            senders: pc.getSenders().map(sender => ({
                kind: sender.track?.kind,
                enabled: sender.track?.enabled,
                id: sender.track?.id
            })),
            receivers: pc.getReceivers().map(receiver => ({
                kind: receiver.track?.kind,
                enabled: receiver.track?.enabled,
                id: receiver.track?.id
            }))
        }))
    );
};
