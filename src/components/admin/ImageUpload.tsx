import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Avatar,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Stack,
} from '@mui/material';
import {
  PhotoCamera,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  CameraAlt as CameraIcon,
} from '@mui/icons-material';

interface ImageUploadProps {
  value: string;
  onChange: (base64Image: string) => void;
  label?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ value, onChange, label = "Student Photo" }) => {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      try {
        const base64 = await convertToBase64(file);
        onChange(base64);
      } catch (error) {
        console.error('Error converting file to base64:', error);
        alert('Error processing image');
      }
    }
  };

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      setStream(mediaStream);
      setCameraOpen(true);
      
      // Set video stream after dialog opens
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  // Capture photo from camera
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        const base64 = canvas.toDataURL('image/jpeg', 0.8);
        onChange(base64);
        stopCamera();
      }
    }
  };

  // Remove image
  const removeImage = () => {
    onChange('');
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {label}
      </Typography>
      
      <Paper 
        elevation={1} 
        sx={{ 
          p: 2, 
          textAlign: 'center',
          border: '2px dashed #ccc',
          borderRadius: 2,
          backgroundColor: '#fafafa'
        }}
      >
        {value ? (
          <Box>
            <Avatar
              src={value}
              sx={{ 
                width: 120, 
                height: 120, 
                mx: 'auto', 
                mb: 2,
                border: '3px solid #1976d2'
              }}
            />
            <Stack direction="row" spacing={1} justifyContent="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<CameraIcon />}
                onClick={startCamera}
              >
                Retake
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={removeImage}
              >
                Remove
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box>
            <PhotoCamera sx={{ fontSize: 48, color: '#ccc', mb: 2 }} />
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Upload or capture student photo
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Photo
              </Button>
              <Button
                variant="outlined"
                startIcon={<CameraIcon />}
                onClick={startCamera}
              >
                Take Photo
              </Button>
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileUpload}
      />

      {/* Camera Dialog */}
      <Dialog 
        open={cameraOpen} 
        onClose={stopCamera}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Take Photo
          <IconButton
            onClick={stopCamera}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <DeleteIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxWidth: '640px',
                height: 'auto',
                borderRadius: '8px',
                backgroundColor: '#000'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={stopCamera}>
            Cancel
          </Button>
          <Button 
            onClick={capturePhoto} 
            variant="contained"
            startIcon={<PhotoCamera />}
          >
            Capture Photo
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ImageUpload;