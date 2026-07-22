import React, { useRef, useState, useEffect } from "react";
import { Camera, RefreshCw, X, Check, ToggleLeft, ToggleRight } from "lucide-react";

interface LessonCameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function LessonCameraCapture({ onCapture, onClose }: LessonCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    setCapturedImage(null);
    
    // Stop any existing stream first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: facingMode, 
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      // If environment camera is not available, try user camera
      if (facingMode === "environment") {
        console.log("Environment camera failed, falling back to user camera");
        setFacingMode("user");
      } else {
        setErrorMsg(
          "Não conseguimos acessar sua câmera. Por favor, verifique se permitiu o acesso à câmera nas configurações do seu navegador."
        );
      }
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
        // Use actual video dimensions for high quality
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        
        // Clear transform
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Mirror horizontally ONLY if using user camera (front-facing)
        if (facingMode === "user") {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL("image/jpeg", 0.90);
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

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === "environment" ? "user" : "environment");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white border-2 border-slate-100 rounded-[28px] max-w-2xl w-full p-6 md:p-8 shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-50 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1">
          <h4 className="font-display font-bold text-xl text-slate-800 flex items-center justify-center gap-2">
            Tirar Foto da Tarefa 📸
          </h4>
          <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto leading-relaxed">
            Aponte a câmera para a folha de papel ou livro escolar. Tente enquadrar todo o texto com boa iluminação!
          </p>
        </div>

        {/* Live Camera Preview or Captured image */}
        <div className="relative aspect-[4/3] w-full max-w-xl mx-auto rounded-2xl overflow-hidden border-2 border-amber-300 shadow-md bg-slate-950 flex items-center justify-center">
          {errorMsg ? (
            <div className="p-6 text-center space-y-4 max-w-sm text-white">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm font-bold leading-relaxed text-rose-400">{errorMsg}</p>
              <button 
                onClick={startCamera}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 mx-auto shadow-md transition-all"
              >
                <RefreshCw size={14} /> Tentar Novamente
              </button>
            </div>
          ) : capturedImage ? (
            <img
              src={capturedImage}
              alt="Foto capturada"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
              />
              {/* Document Alignment Frame Guide Overlay */}
              <div className="absolute inset-6 md:inset-10 border-2 border-dashed border-amber-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                <p className="bg-slate-950/75 text-amber-300 text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
                  Posicione o texto dentro desta área
                </p>
              </div>
            </>
          )}
        </div>

        {/* Hidden Canvas for capture processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Selector & Toggle (Only show if camera active and not captured yet) */}
        {!capturedImage && !errorMsg && isCameraActive && (
          <div className="flex justify-center">
            <button
              onClick={toggleCameraFacing}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
              title="Trocar entre câmera frontal e traseira"
            >
              <RefreshCw size={12} className="text-slate-500 animate-spin-slow" />
              <span>Usar Câmera: {facingMode === "environment" ? "Traseira 📱" : "Frontal (Selfie) 🤳"}</span>
            </button>
          </div>
        )}

        {/* Action Button Bar */}
        <div className="pt-2 flex gap-4">
          {capturedImage ? (
            <>
              <button
                onClick={handleRetry}
                className="flex-1 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-sm py-3 rounded-2xl transition-all flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={16} /> Tirar Outra Foto
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-display font-black text-sm py-3 rounded-2xl shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-1.5"
              >
                <Check size={18} /> Usar Esta Foto
              </button>
            </>
          ) : (
            <button
              onClick={handleCapture}
              disabled={!isCameraActive || !!errorMsg}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white font-display font-black text-base py-3.5 rounded-2xl shadow-lg shadow-amber-100 transition-all flex items-center justify-center gap-2"
            >
              <Camera size={22} /> Capturar Foto Agora!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
