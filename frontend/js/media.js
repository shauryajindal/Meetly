let localStream = null;

export async function startLocalMedia() {
    let audioStream = null;
    let videoStream = null;

    try {
        audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true
        });
    } catch (error) {
        console.warn("Microphone unavailable:", error.message);
    }

    try {
        videoStream = await navigator.mediaDevices.getUserMedia({
            video: true
        });
    } catch (error) {
        console.warn("Camera unavailable:", error.message);
    }

    const tracks = [
        ...(audioStream?.getAudioTracks() || []),
        ...(videoStream?.getVideoTracks() || [])
    ];

    localStream = new MediaStream(tracks);

    console.log("LOCAL MEDIA:", {
        audio: localStream.getAudioTracks().length > 0,
        video: localStream.getVideoTracks().length > 0
    });

    return localStream;
}

export function getLocalStream() {
  return localStream
}

export function stopLocalMedia() {
  if (!localStream) return;

  localStream.getTracks().forEach(track=> {
    track.stop()
  })
  localStream=null
}

export function toggleAudio() {
  const localStream = getLocalStream();

  if (!localStream) return false;
  const audio = localStream.getAudioTracks()[0];
  if (!audio) {
    return false
  }

  audio.enabled = !audio.enabled;
  return audio.enabled
}

export function toggleVideo() {
    const localStream = getLocalStream();

    if (!localStream) return false;

    const videoTrack = localStream.getVideoTracks()[0];

    if (!videoTrack) return false;

    videoTrack.enabled = !videoTrack.enabled;

    return videoTrack.enabled;
}

let screenStream = null;

export async function startScreenShare() {
   screenStream = await navigator.mediaDevices.getDisplayMedia({
    video: true,
    audio: false,
   })
  
   const screenTrack = screenStream.getVideoTracks()[0];

   screenTrack.onended = () => {
       console.log("SCREEN SHARE ENDED");

       stopScreenShare();

       window.dispatchEvent(
           new CustomEvent("screen-share-ended")
       );
   };
  return screenStream;
}

export function getScreenStream() {
  return screenStream
}

export function stopScreenShare() {
  if (!screenStream) return;

  screenStream.getTracks().forEach((track) => track.stop());

  screenStream = null;
}