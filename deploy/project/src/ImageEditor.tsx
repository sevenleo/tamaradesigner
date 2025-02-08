import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { RotateCw, Palette, Crop as CropIcon, X, Droplet, Copy, RotateCcw, CheckCircle } from 'lucide-react';
import { ImageProtection } from './ImageProtection';

interface ImageEditorProps {
  imageUrl: string;
  onClose: () => void;
  onSave: (editedImageUrl: string) => void;
}

export function ImageEditor({ imageUrl, onClose, onSave }: ImageEditorProps) {
  const [crop, setCrop] = useState<Crop>();
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [colorShift, setColorShift] = useState({
    r: 0,
    g: 0,
    b: 0
  });
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Função para calcular as dimensões do canvas após a rotação
  const calculateRotatedDimensions = (width: number, height: number, angle: number) => {
    const radians = (angle * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    
    const newWidth = Math.floor(width * cos + height * sin);
    const newHeight = Math.floor(width * sin + height * cos);
    
    return { width: newWidth, height: newHeight };
  };

  const resetEdits = () => {
    setCrop(undefined);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setColorShift({ r: 0, g: 0, b: 0 });
  };

  const copyToClipboard = async () => {
    try {
      if (!previewCanvasRef.current) {
        throw new Error('Preview canvas not available');
      }

      const previewCanvas = previewCanvasRef.current;
      
      // Criar um novo canvas para a cópia
      const copyCanvas = document.createElement('canvas');
      copyCanvas.width = previewCanvas.width;
      copyCanvas.height = previewCanvas.height;
      
      const ctx = copyCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      
      // Copiar o conteúdo do preview canvas
      ctx.drawImage(previewCanvas, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        copyCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });

      const item = new ClipboardItem({
        'image/png': blob,
      });

      await navigator.clipboard.write([item]);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Falha ao copiar imagem. Por favor, tente novamente.');
    }
  };

  useEffect(() => {
    if (!imageRef.current || !previewCanvasRef.current) return;

    const updatePreview = () => {
      const canvas = previewCanvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      const img = imageRef.current!;

      // Calcular as novas dimensões baseadas na rotação
      const rotatedDimensions = calculateRotatedDimensions(img.width, img.height, rotation);
      
      // Atualizar as dimensões do canvas
      canvas.width = rotatedDimensions.width;
      canvas.height = rotatedDimensions.height;

      // Limpar o canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Transladar para o centro do canvas
      ctx.translate(canvas.width / 2, canvas.height / 2);
      
      // Aplicar a rotação
      ctx.rotate((rotation * Math.PI) / 180);

      // Calcular a posição para centralizar a imagem
      const drawX = -img.width / 2;
      const drawY = -img.height / 2;

      // Desenhar a imagem
      if (crop && crop.width && crop.height) {
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        
        ctx.drawImage(
          img,
          crop.x * scaleX,
          crop.y * scaleY,
          crop.width * scaleX,
          crop.height * scaleY,
          drawX,
          drawY,
          img.width,
          img.height
        );
      } else {
        ctx.drawImage(img, drawX, drawY, img.width, img.height);
      }

      // Aplicar os ajustes de cor
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Ajustes de cor
        data[i] = Math.min(255, Math.max(0, data[i] + colorShift.r));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + colorShift.g));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + colorShift.b));

        // Brilho
        const brightnessMultiplier = brightness / 100;
        data[i] *= brightnessMultiplier;
        data[i + 1] *= brightnessMultiplier;
        data[i + 2] *= brightnessMultiplier;

        // Contraste
        const contrastFactor = (contrast / 100) ** 2;
        data[i] = ((data[i] / 255 - 0.5) * contrastFactor + 0.5) * 255;
        data[i + 1] = ((data[i + 1] / 255 - 0.5) * contrastFactor + 0.5) * 255;
        data[i + 2] = ((data[i + 2] / 255 - 0.5) * contrastFactor + 0.5) * 255;

        // Saturação
        const saturationFactor = saturation / 100;
        const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
        data[i] = gray + (data[i] - gray) * saturationFactor;
        data[i + 1] = gray + (data[i + 1] - gray) * saturationFactor;
        data[i + 2] = gray + (data[i + 2] - gray) * saturationFactor;
      }

      ctx.putImageData(imageData, 0, 0);
      ctx.restore();
    };

    const img = imageRef.current;
    if (img.complete) {
      updatePreview();
    } else {
      img.onload = updatePreview;
    }
  }, [crop, rotation, brightness, contrast, saturation, colorShift]);

  const handleSave = () => {
    if (!outputCanvasRef.current || !imageRef.current) return;

    const canvas = outputCanvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const img = imageRef.current;

    // Usar as mesmas dimensões calculadas para o preview
    const rotatedDimensions = calculateRotatedDimensions(
      img.naturalWidth,
      img.naturalHeight,
      rotation
    );

    canvas.width = rotatedDimensions.width;
    canvas.height = rotatedDimensions.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();

    // Centralizar e rotacionar
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawX = -img.naturalWidth / 2;
    const drawY = -img.naturalHeight / 2;

    if (crop && crop.width && crop.height) {
      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      
      ctx.drawImage(
        img,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        drawX,
        drawY,
        img.naturalWidth,
        img.naturalHeight
      );
    } else {
      ctx.drawImage(img, drawX, drawY, img.naturalWidth, img.naturalHeight);
    }

    // Aplicar os mesmos ajustes de cor
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + colorShift.r));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + colorShift.g));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + colorShift.b));

      const brightnessMultiplier = brightness / 100;
      data[i] *= brightnessMultiplier;
      data[i + 1] *= brightnessMultiplier;
      data[i + 2] *= brightnessMultiplier;

      const contrastFactor = (contrast / 100) ** 2;
      data[i] = ((data[i] / 255 - 0.5) * contrastFactor + 0.5) * 255;
      data[i + 1] = ((data[i + 1] / 255 - 0.5) * contrastFactor + 0.5) * 255;
      data[i + 2] = ((data[i + 2] / 255 - 0.5) * contrastFactor + 0.5) * 255;

      const saturationFactor = saturation / 100;
      const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
      data[i] = gray + (data[i] - gray) * saturationFactor;
      data[i + 1] = gray + (data[i + 1] - gray) * saturationFactor;
      data[i + 2] = gray + (data[i + 2] - gray) * saturationFactor;
    }

    ctx.putImageData(imageData, 0, 0);
    ctx.restore();

    const editedImageUrl = canvas.toDataURL('image/png');
    onSave(editedImageUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Editar Imagem</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="relative">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Original:</h3>
              <ImageProtection watermarkText={`Tamara Designer - Editando`}>
                <ReactCrop
                  crop={crop}
                  onChange={c => setCrop(c)}
                  aspect={undefined}
                >
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Editar"
                    className="max-w-full"
                    crossOrigin="anonymous"
                  />
                </ReactCrop>
              </ImageProtection>
              
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4 mb-2">Prévia:</h3>
              <ImageProtection watermarkText={`Tamara Designer - Prévia`}>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                  <canvas
                    ref={previewCanvasRef}
                    className="max-w-full rounded-lg"
                  />
                </div>
              </ImageProtection>

              <canvas
                ref={outputCanvasRef}
                className="hidden"
              />

              <div className="mt-4 flex gap-2">
                <button
                  onClick={resetEdits}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar Original
                </button>
                <button
                  onClick={copyToClipboard}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                >
                  {copiedToClipboard ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copiar para Área de Transferência
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2 text-gray-900 dark:text-white">
                <Droplet className="h-4 w-4" />
                Ajuste de Cores
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                    Vermelho
                  </label>
                  <input
                    type="range"
                    min="-255"
                    max="255"
                    value={colorShift.r}
                    onChange={(e) => setColorShift(prev => ({ ...prev, r: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                    Verde
                  </label>
                  <input
                    type="range"
                    min="-255"
                    max="255"
                    value={colorShift.g}
                    onChange={(e) => setColorShift(prev => ({ ...prev, g: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                    Azul
                  </label>
                  <input
                    type="range"
                    min="-255"
                    max="255"
                    value={colorShift.b}
                    onChange={(e) => setColorShift(prev => ({ ...prev, b: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2 text-gray-900 dark:text-white">
                <CropIcon className="h-4 w-4" />
                Recortar
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Arraste para recortar a imagem
              </p>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2 text-gray-900 dark:text-white">
                <RotateCw className="h-4 w-4" />
                Rotação
              </h3>
              <input
                type="range"
                min="0"
                max="360"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {rotation}°
              </div>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-medium mb-2 text-gray-900 dark:text-white">
                <Palette className="h-4 w-4" />
                Ajustes de Imagem
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Brilho</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Contraste</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-300">Saturação</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* <button
              onClick={handleSave}
              className="w-full bg-indigo-600 dark:bg-indigo-500 text-white py-2 px-4 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              Aplicar Alterações
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
}