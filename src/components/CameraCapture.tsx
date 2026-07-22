import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, X, Check } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setErrorMsg(null);
    setCapturedImage(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 400 }, height: { ideal: 400 } },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setErrorMsg(
        "Não conseguimos acessar sua câmera. Verifique se deu permissão de acesso à câmera no seu navegador."
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        // Draw the current video frame on the canvas
        canvas.width = video.videoWidth || 300;
        canvas.height = video.videoHeight || 300;
        
        // Mirror the image horizontally for natural user selfie view
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const handleSave = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  const handleRetry = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white border-2 border-amber-200 rounded-[24px] max-w-sm w-full p-6 shadow-2xl space-y-4 relative">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center space-y-1">
          <h4 className="font-display font-bold text-lg text-slate-800">
            Tirar Foto do Perfil 📸
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Sorria para a foto! Ela vai aparecer no seu avatar.
          </p>
        </div>

        {/* Live Camera Preview or Captured image */}
        <div className="relative aspect-square w-full max-w-[260px] mx-auto rounded-full overflow-hidden border-4 border-amber-400 shadow-md bg-slate-50 flex items-center justify-center">
          {errorMsg ? (
            <div className="p-4 text-center space-y-3">
              <span className="text-3xl">⚠️</span>
              <p className="text-xs text-rose-500 font-bold leading-relaxed">{errorMsg}</p>
              <button 
                onClick={startCamera}
                className="text-xs font-bold text-amber-600 hover:underline flex items-center justify-center gap-1 mx-auto"
              >
                <RefreshCw size={12} /> Tentar novamente
              </button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Seu sorriso capturado!"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover -scale-x-100" // Mirror live preview
            />
          )}
        </div>

        {/* Hidden Canvas for capture processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Action button bar */}
        <div className="pt-2 flex gap-3">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetry}
                className="flex-1 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-1"
              >
                <RefreshCw size={16} /> Refazer
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm py-2.5 rounded-xl shadow-sm shadow-emerald-100 transition-all flex items-center justify-center gap-1"
              >
                <Check size={16} /> Salvar Foto
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              disabled={!isCameraActive || !!errorMsg}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white font-display font-extrabold text-base py-3 rounded-xl shadow-md shadow-amber-100 transition-all flex items-center justify-center gap-2"
            >
              <Camera size={20} /> Tirar Foto Agora!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
