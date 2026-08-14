import React, { useEffect, useRef, useState } from 'react';

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
const CHECK_INTERVAL_MS = 4000;
const NO_FACE_TOLERANCE = 2;

const DETECTOR_OPTIONS_FACTORY = () =>
  new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 });

export default function WebcamProctor({ socketRef, sessionId, onWarning }) {
  const videoRef = useRef(null);
  const [modelsReady, setModelsReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [debugStatus, setDebugStatus] = useState('starting');
  const noFaceStreakRef = useRef(0);
  const streamRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(null);

  useEffect(() => {
    let stream;

    async function setup() {
      try {
        if (!window.faceapi) {
          setCameraError('Face detection library failed to load.');
          return;
        }

        setDebugStatus('loading model...');
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setModelsReady(true);

        setDebugStatus('requesting camera...');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
          audio: true,
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await new Promise((resolve) => {
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
              resolve();
            };
          });
        }
        setDebugStatus('ready');
      } catch (err) {
        console.error('Webcam/proctor setup error:', err);
        setCameraError('Camera access denied or unavailable — proctoring checks are disabled.');
      }
    }

    setup();
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!modelsReady || cameraError) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 3 || video.videoWidth === 0) return;

      try {
        const detections = await window.faceapi.detectAllFaces(video, DETECTOR_OPTIONS_FACTORY());

        if (detections.length === 0) {
          noFaceStreakRef.current += 1;
          if (noFaceStreakRef.current >= NO_FACE_TOLERANCE) {
            socketRef.current?.emit('proctor-event', {
              sessionId,
              eventType: 'no_face',
              details: { timestamp: new Date().toISOString() },
            });
            onWarning('No face detected — please stay in view of the camera.');
          }
        } else {
          noFaceStreakRef.current = 0;
          if (detections.length > 1) {
            socketRef.current?.emit('proctor-event', {
              sessionId,
              eventType: 'multiple_faces',
              details: { count: detections.length, timestamp: new Date().toISOString() },
            });
            onWarning(`${detections.length} faces detected — only the candidate should be visible.`);
          }
        }
      } catch (err) {
        console.error('Detection error:', err);
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [modelsReady, cameraError, sessionId]);

  const startRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];
    setRecordingUrl(null);

    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      setRecordingUrl(URL.createObjectURL(blob));
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#161922', padding: 10, borderRadius: 10, zIndex: 60, maxWidth: 280 }}>
      <video ref={videoRef} autoPlay muted playsInline width={240} height={180} style={{ borderRadius: 8, display: cameraError ? 'none' : 'block', boxShadow: '0 2px 8px rgba(0,0,0,0.6)' }} />
      {cameraError && <p style={{ fontSize: 11, color: '#f5a5a5', maxWidth: 160 }}>{cameraError}</p>}
      {!cameraError && !modelsReady && <p style={{ fontSize: 11, color: '#888' }}>{debugStatus}</p>}

      {!cameraError && modelsReady && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{ fontSize: 13, padding: '8px 10px', width: '100%', background: isRecording ? '#a33' : '#333', borderRadius: 6 }}
          >
            {isRecording ? '⏹ Stop Recording' : '⏺ Record Interview'}
          </button>
          {recordingUrl && (
            <a
              href={recordingUrl}
              download={`interview-recording-${sessionId}.webm`}
              style={{ display: 'block', fontSize: 11, color: 'var(--accent)', marginTop: 4, textAlign: 'center' }}
            >
              ⬇ Download Recording
            </a>
          )}
        </div>
      )}
    </div>
  );
}
