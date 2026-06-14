/**
 * @fileoverview User Dashboard and Scan Upload interface (iOS and Mobile optimized).
 * @module pages/user-dashboard
 */

import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/use-auth';
import { api } from '../api/client';
import { 
  Camera, UploadCloud, RefreshCw, LogOut, Shield, 
  CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { DiagnosticConsole } from '../components/diagnostic-console';


/**
 * Compresses and resizes an image file natively in the browser using HTML5 Canvas.
 * Optimized for mobile Safari/Chrome to prevent onload race-condition hanging.
 * 
 * @param {File} file - The raw input file from input picker.
 * @param {number} [maxWidth=1600] - Max width constraint.
 * @param {number} [maxHeight=1600] - Max height constraint.
 * @param {number} [quality=0.8] - Output JPEG quality (0.0 to 1.0).
 * @returns {Promise<File>} Compressed File object.
 */
function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.8) {
  console.log('[COMPRESS] Starting compression via Object URL for:', file.name, 'Size:', file.size, 'type:', file.type);
  return new Promise((resolve, reject) => {
    let objectUrl = null;
    try {
      objectUrl = URL.createObjectURL(file);
      console.log('[COMPRESS] Object URL created:', objectUrl);
    } catch (err) {
      console.error('[COMPRESS] Failed to create object URL:', err);
      return reject(new Error('Failed to load image file reference: ' + err.message));
    }

    const img = new Image();
    
    // CRITICAL FOR MOBILE SAFARI: Define onload and onerror BEFORE setting img.src
    img.onload = () => {
      console.log('[COMPRESS] Image loaded successfully. Original size:', img.width, 'x', img.height);
      
      // Clean up the object URL immediately once the image is loaded
      URL.revokeObjectURL(objectUrl);
      console.log('[COMPRESS] Revoked object URL.');

      let width = img.width;
      let height = img.height;

      // Calculate new responsive dimensions
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      console.log('[COMPRESS] New target dimensions:', width, 'x', height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[COMPRESS] Failed to get 2D canvas context.');
        return reject(new Error('Failed to get 2D canvas context.'));
      }

      ctx.drawImage(img, 0, 0, width, height);
      console.log('[COMPRESS] Image drawn to canvas.');

      // Fallback for canvas.toBlob on older mobile browsers
      if (canvas.toBlob) {
        console.log('[COMPRESS] Using canvas.toBlob...');
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              console.error('[COMPRESS] canvas.toBlob returned null blob.');
              return reject(new Error('Canvas image compression failed.'));
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log('[COMPRESS] Compression complete. New size:', compressedFile.size);
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      } else {
        console.log('[COMPRESS] toBlob not supported. Falling back to toDataURL...');
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const parts = dataUrl.split(',');
          const mime = parts[0].match(/:(.*?);/)[1];
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          const blob = new Blob([u8arr], { type: mime });
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          console.log('[COMPRESS] Fallback complete. New size:', compressedFile.size);
          resolve(compressedFile);
        } catch (e) {
          console.error('[COMPRESS] Fallback dataURL compression failed:', e);
          reject(new Error('Canvas toDataURL fallback failed: ' + e.message));
        }
      }
    };
    
    img.onerror = (err) => {
      console.error('[COMPRESS] Image onload error:', err);
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      reject(new Error('Failed to load image element on mobile: ' + (err.message || 'unknown error')));
    };
    
    // Prevent GC of image on mobile during load
    window.__debugImgRef = img;
    img.src = objectUrl; // Set src LAST after handlers are bound
  });
}



export function UserDashboard({ onNavigate }) {
  const { user, role, signOut } = useAuth();
  
  // State variables
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  
  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  const fileInputRef = useRef(null);

  function showToast(message, type = 'success') {
    setToast({ show: true, message, type });
    if (type !== 'info') {
      setTimeout(() => {
        setToast((current) => current.message === message ? { ...current, show: false } : current);
      }, 4000);
    }
  }

  // Handle file picker selection
  function handleFileChange(e) {
    try {
      const file = e.target.files[0];
      if (!file) return;

      const isImage = (file.type && file.type.startsWith('image/')) || 
                      /\.(jpe?g|png|gif|webp|bmp)$/i.test(file.name);

      if (!isImage) {
        showToast('Please select a valid image file.', 'error');
        return;
      }

      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      console.error('File selection error:', err);
      showToast('File load error: ' + err.message, 'error');
    }
  }



  // Trigger file selection (triggers camera on mobile)
  function triggerScanner() {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }

  // Cancel selected scan
  function handleCancelPreview() {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }

  // Upload scan via Express backend
  async function handleUpload() {
    console.log('[UPLOAD] handleUpload clicked. File:', selectedFile ? `${selectedFile.name} (${selectedFile.size} bytes)` : 'No file');
    if (!selectedFile) return;

    setUploading(true);
    showToast('Compressing image size...', 'info');

    try {
      // 1. Compress image in browser (safely resolves on iOS/Android now)
      console.log('[UPLOAD] Initiating compressImage...');
      const compressedFile = await compressImage(selectedFile);
      console.log('[UPLOAD] Image compression returned file size:', compressedFile.size);
      
      const formData = new FormData();
      formData.append('image', compressedFile);

      showToast('Uploading file to server...', 'info');
      console.log('[UPLOAD] Initiating POST /api/upload request...');

      // 2. Upload file
      const result = await api.post('/upload', formData);
      console.log('[UPLOAD] Server response:', result);
      
      showToast('Scan uploaded successfully to cloud directory.', 'success');
      handleCancelPreview();
    } catch (err) {
      console.error('[UPLOAD] Failed:', err);
      showToast(err.message || 'Failed to upload scan.', 'error');
    } finally {
      setUploading(false);
    }
  }


  // Helpers
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Centered Toast Notification Container */}
      {toast.show && (
        <div className="fixed top-6 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 animate-fade-in">
          <div className={`pointer-events-auto flex items-center space-x-3 p-4 rounded-xl shadow-xl border w-full max-w-sm ${
            toast.type === 'error' 
              ? 'bg-red-950/95 border-red-500/30 text-red-200' 
              : toast.type === 'info'
                ? 'bg-zinc-900/95 border-zinc-700/50 text-zinc-300 font-mono animate-pulse'
                : 'bg-zinc-900/95 border-zinc-700/50 text-white font-mono'
          }`}>
            {toast.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
            ) : toast.type === 'info' ? (
              <RefreshCw className="h-4 w-4 text-zinc-400 animate-spin flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-white flex-shrink-0" />
            )}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}


      {/* Header bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-widest uppercase font-mono flex items-center gap-2">
            <span>Scanner Console</span>
            {role === 'admin' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold border border-zinc-700 flex items-center gap-1 uppercase">
                <Shield className="h-3 w-3" /> Admin
              </span>
            )}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">{user?.email}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {role === 'admin' && (
            <button
              onClick={() => onNavigate('/admin')}
              className="py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              <Shield className="h-4 w-4" />
              <span>Admin Panel</span>
            </button>
          )}

          <button
            onClick={() => signOut()}
            className="py-2 px-4 rounded-xl bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2 cursor-pointer border border-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Scanner Section */}
      <section className="mb-12">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 font-mono">Capture Document</h2>
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {!previewUrl ? (
          /* Large Clickable Scanner Area */
          <div 
            onClick={triggerScanner}
            className="glass-panel border-dashed border border-zinc-800 hover:border-zinc-500 hover:bg-zinc-950/40 rounded-2xl p-16 text-center flex flex-col items-center justify-center cursor-pointer transition-all duration-350 group"
          >
            <div className="h-14 w-14 bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-800 mb-4 group-hover:border-white transition-colors duration-300">
              <Camera className="h-6 w-6 text-zinc-400 group-hover:text-white" />
            </div>
            <h3 className="text-base font-bold text-white mb-2 uppercase tracking-wide font-mono">Scan Document</h3>
            <p className="text-xs text-zinc-400 max-w-sm mb-1">
              Tap to open your device camera (mobile) or choose a file from your desktop.
            </p>
            <span className="text-[10px] text-zinc-650 font-mono">Only administrators can access and view uploads.</span>
          </div>
        ) : (
          /* Scan Preview Mode */
          <div className="glass-panel rounded-2xl p-6 md:p-8 animate-fade-in border border-zinc-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Preview image */}
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 max-h-96 flex items-center justify-center bg-black/80">
                <img 
                  src={previewUrl} 
                  alt="Scan preview" 
                  className="max-h-96 object-contain w-full"
                />
              </div>

              {/* Upload settings */}
              <div className="flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-bold border border-zinc-700 font-mono uppercase">
                    Capture Ready
                  </span>
                  <h3 className="text-lg font-bold text-white truncate font-mono">{selectedFile.name}</h3>
                  <div className="space-y-2 text-xs text-zinc-400 font-mono">
                    <p className="flex justify-between border-b border-zinc-800 pb-2">
                      <span>File Size:</span>
                      <strong className="text-white">{formatBytes(selectedFile.size)}</strong>
                    </p>
                    <p className="flex justify-between border-b border-zinc-800 pb-2">
                      <span>Format:</span>
                      <strong className="text-white uppercase">{selectedFile.name.split('.').pop()}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-200 disabled:bg-zinc-800 text-black disabled:text-zinc-500 font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-zinc-500" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        <span>Upload Scan</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCancelPreview}
                    disabled={uploading}
                    className="py-2.5 px-6 rounded-xl bg-black hover:bg-zinc-900 text-zinc-400 hover:text-white font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer border border-zinc-800 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Persistent mobile debugging logs console */}
      <DiagnosticConsole />
    </div>
  );
}

