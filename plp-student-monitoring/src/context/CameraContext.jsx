import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';

const CameraContext = createContext();

export const useCameraContext = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCameraContext must be used within a CameraProvider');
  }
  return context;
};

export const CameraProvider = ({ children }) => {
  const [cameraFrame, setCameraFrame] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('neutral');
  const [detectedFace, setDetectedFace] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [videoStream, setVideoStreamState] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameIntervalRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        console.log("Cleaning up camera stream");
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, []);

  // This just returns the existing stream, doesn't create a new one
  const initializeCamera = useCallback(async () => {
    if (streamRef.current) {
      console.log("Camera already initialized, returning existing stream");
      return streamRef.current;
    }
    console.log("No camera stream available yet. FaceRecognition will provide it.");
    return null;
  }, []);

  // Release camera
  const releaseCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      console.log("Camera released.");
    }
    stopFrameCapture();
    setVideoStreamState(null);
    setIsCameraActive(false);
    setCameraFrame(null);
    setCameraStatus('neutral');
    setDetectedFace(null);
  }, []);

  const updateCameraFrame = useCallback((imageData) => {
    if (!imageData) return;
    setCameraFrame(imageData);
  }, []);

  const updateCameraStatus = useCallback((status, faceData = null) => {
    console.log(`CameraContext: Updating status to: ${status}`);
    setCameraStatus(status);
    if (faceData) {
      setDetectedFace(faceData);
    } else if (status === 'neutral') {
      setDetectedFace(null);
    }
  }, []);

  const resetCameraState = useCallback(() => {
    console.log('CameraContext: Resetting camera state');
    setCameraStatus('neutral');
    setDetectedFace(null);
  }, []);

  const setActiveCameraState = useCallback((isActive) => {
    console.log(`CameraContext: Setting camera active to: ${isActive}`);
    setIsCameraActive(isActive);
  }, []);

  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
    }

    console.log('CameraContext: Starting frame capture');
    frameIntervalRef.current = setInterval(() => {
      if (streamRef.current && videoRef.current && videoRef.current.srcObject) {
        try {
          if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
            if (!canvasRef.current) {
              canvasRef.current = document.createElement('canvas');
            }
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0);
            const frameData = canvasRef.current.toDataURL('image/jpeg', 0.7);
            setCameraFrame(frameData);
          }
        } catch (err) {
          console.error('CameraContext: Error capturing frame:', err);
        }
      }
    }, 100);
  }, []);

  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
      console.log('CameraContext: Stopped frame capture');
    }
  }, []);

  // This receives the stream from FaceRecognition
  const setVideoStream = useCallback((stream) => {
    console.log(`CameraContext: Setting video stream from FaceRecognition: ${!!stream}`);
    if (stream) {
      streamRef.current = stream;
      setVideoStreamState(stream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      startFrameCapture();
    } else {
      stopFrameCapture();
      setVideoStreamState(null);
      setIsCameraActive(false);
    }
  }, [startFrameCapture, stopFrameCapture]);

  const getVideoStream = useCallback(() => {
    return streamRef.current;
  }, []);

  const value = useMemo(() => ({
    cameraFrame,
    cameraStatus,
    detectedFace,
    isCameraActive,
    videoStream,
    videoRef,
    initializeCamera,
    releaseCamera,
    updateCameraFrame,
    updateCameraStatus,
    resetCameraState,
    setActiveCameraState,
    setVideoStream,
    getVideoStream,
  }), [cameraFrame, cameraStatus, detectedFace, isCameraActive, videoStream]);

  return (
    <CameraContext.Provider value={value}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}
      />
      {children}
    </CameraContext.Provider>
  );
};