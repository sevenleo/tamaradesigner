import React, { useState, useEffect } from 'react';
import {
  ImageIcon,
  CheckCircle,
  Copy,
  Pencil,
  RotateCcw,
  Moon,
  Sun,
  Instagram,
  Search,
  ChevronLeft,
  ChevronRight,
  Lock,
  LogOut,
  LogIn,
  Share2,
} from 'lucide-react';
import { ImageEditor } from './ImageEditor';
import LoginForm from './LoginForm';
import { ProtectedImage } from './ProtectedImage';
import { BASE_URL } from './config';

interface Image {
  url: string;
  title: string;
  promote?: number;
  favorite?: number;
  likes?: number;
  recent?: number;
  premium?: boolean;
  fallbackUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
}

function toTitleCase(str: string): string {
  str = str.replace(/_/g, ' ');
  return str
    .split(' ')
    .map((word) => {
      if (word.length === 0) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function sortImages(images: Image[]): Image[] {
  return [...images].sort((a, b) => {
    // 1. Ordenar por promote (crescente)
    if (a.promote !== undefined && b.promote !== undefined) {
      return a.promote - b.promote;
    }
    if (a.promote !== undefined) return -1;
    if (b.promote !== undefined) return 1;

    // 2. Ordenar por favorite (decrescente)
    if (a.favorite !== undefined && b.favorite !== undefined) {
      return b.favorite - a.favorite;
    }
    if (a.favorite !== undefined) return -1;
    if (b.favorite !== undefined) return 1;

    // 3. Ordenar por likes (decrescente)
    if (a.likes !== undefined && b.likes !== undefined) {
      return b.likes - a.likes;
    }
    if (a.likes !== undefined) return -1;
    if (b.likes !== undefined) return 1;

    // 4. Ordenar por recent (decrescente)
    if (a.recent !== undefined && b.recent !== undefined) {
      return b.recent - a.recent;
    }
    if (a.recent !== undefined) return -1;
    if (b.recent !== undefined) return 1;

    // 5. Manter ordem original para imagens sem campos opcionais
    return 0;
  });
}

function App() {
  const [localImages, setLocalImages] = useState<Image[]>([]);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<{
    url: string;
    title: string;
  } | null>(null);
  const [editedImages, setEditedImages] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode === null ? true : savedMode === 'true';
    }
    return true;
  });

  const [auth, setAuth] = useState<AuthState>(() => {
    const savedAuth = localStorage.getItem('auth');
    return savedAuth
      ? JSON.parse(savedAuth)
      : { isAuthenticated: false, username: null };
  });
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: '',
  });

  const ITEMS_PER_PAGE = 48;

  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(auth));
  }, [auth]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.username === 'tamara' && loginForm.password === 'tamara') {
      setAuth({ isAuthenticated: true, username: loginForm.username });
      setShowLoginForm(false);
      setLoginError(null);
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('Credenciais inválidas');
    }
  };

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, username: null });
  };

  useEffect(() => {
    const loadImages = async () => {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/sevenleo/tamaradesigner/refs/heads/main/figurinhas/figurinhas.json'
        );
        if (!response.ok) {
          throw new Error('Failed to load images');
        }
        const data = await response.json();
        const transformedImages = data.images.map((img: Image) => ({
          ...img,
          title: toTitleCase(img.title),
        }));
        const sortedImages = sortImages(transformedImages);
        setLocalImages(sortedImages);
      } catch (error) {
        console.error('Error loading images:', error);
        alert(
          'Falha ao carregar imagens. Por favor, tente novamente mais tarde.'
        );
      }
    };

    loadImages();
  }, []);

  const filteredImages = localImages.filter((image) =>
    image.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredImages.length / ITEMS_PER_PAGE);

  const getCurrentPageImages = () => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredImages.slice(startIndex, endIndex);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  const handleImageError = (url: string) => {
    const image = localImages.find((img) => img.url === url);
    if (image?.fallbackUrl) {
      setFailedImages((prev) => ({ ...prev, [url]: true }));
    }
  };

  const getImageUrl = (image: Image) => {
    if (failedImages[image.url] && image.fallbackUrl) {
      return image.fallbackUrl;
    }
    return editedImages[image.url] || image.url;
  };

  const resetImage = (url: string) => {
    setEditedImages((prev) => {
      const newState = { ...prev };
      delete newState[url];
      return newState;
    });
    setFailedImages((prev) => {
      const newState = { ...prev };
      delete newState[url];
      return newState;
    });
  };

  const copyImage = async (imageUrl: string) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(img, 0, 0);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png');
      });

      const item = new ClipboardItem({
        'image/png': blob,
      });

      await navigator.clipboard.write([item]);

      setCopiedUrl(imageUrl);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Falha ao copiar imagem. Por favor, tente novamente.');
    }
  };

  const shareImage = async (image: Image) => {
    const imageUrl = getImageUrl(image);
    
    try {
      // Try Web Share API first
      if (navigator.share) {
        // Create a blob from the image
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], `${image.title}.png`, { type: 'image/png' });
        
        await navigator.share({
          title: image.title,
          text: 'Confira esta imagem do Tamara Designer',
          files: [file]
        });
        return;
      }
      
      // Fallback to WhatsApp URL scheme
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(`${image.title}\n${imageUrl}`)}`;
      window.location.href = whatsappUrl;
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Não foi possível compartilhar a imagem. Por favor, tente novamente.');
    }
  };

  const handleSaveEdit = (editedImageUrl: string) => {
    if (editingImage) {
      setEditedImages((prev) => ({
        ...prev,
        [editingImage.url]: editedImageUrl,
      }));
      setEditingImage(null);
    }
  };

  const renderPagination = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => goToPage(1)}
              className={`px-3 py-1 rounded-md ${
                currentPage === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              1
            </button>
            {startPage > 2 && <span className="text-gray-500">...</span>}
          </>
        )}

        {pageNumbers.map((number) => (
          <button
            key={number}
            onClick={() => goToPage(number)}
            className={`px-3 py-1 rounded-md ${
              currentPage === number
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            }`}
          >
            {number}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && (
              <span className="text-gray-500">...</span>
            )}
            <button
              onClick={() => goToPage(totalPages)}
              className={`px-3 py-1 rounded-md ${
                currentPage === totalPages
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-gray-900">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              {/* <ImageIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" /> */}
              <img src={`${BASE_URL}logo.png`} className="h-6 w-6" alt="Logo" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Tamara Designer
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {auth.isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    Olá, {auth.username}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sair
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Entrar
                </button>
              )}
              <a
                href="https://www.instagram.com/tamaraaraujoos/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400 transition-colors"
              >
                <Instagram className="h-6 w-6" />
              </a>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="w-full min-h-screen pt-20 pb-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar imagens por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 sm:text-sm"
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Mostrando {getCurrentPageImages().length} de{' '}
              {filteredImages.length} imagens
              {searchTerm && ` (filtradas por "${searchTerm}")`}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {getCurrentPageImages().map((image) => (
              <div
                key={image.url}
                className="relative group bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-full"
              >
                <div className="flex-1 min-h-0">
                  <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                    <ProtectedImage
                      src={getImageUrl(image)}
                      alt={image.title}
                      className="w-full h-auto object-contain"
                      watermarkText={`Tamara Designer - ${image.title}`}
                    />
                    {(!image.premium || auth.isAuthenticated) && (
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() =>
                            setEditingImage({
                              url: getImageUrl(image),
                              title: image.title,
                            })
                          }
                          className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Editar imagem"
                        >
                          <Pencil className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </button>
                        {(editedImages[image.url] ||
                          failedImages[image.url]) && (
                          <button
                            onClick={() => resetImage(image.url)}
                            className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Restaurar original"
                          >
                            <RotateCcw className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                          </button>
                        )}
                      </div>
                    )}
                    {image.premium && !auth.isAuthenticated && (
                      <div className="absolute top-2 right-2 p-2 bg-yellow-500 rounded-full shadow-md">
                        <Lock className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                    {image.title}
                  </h3>
                  {image.premium && !auth.isAuthenticated ? (
                    <div className="space-y-2">
                      <button
                        disabled
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-400 cursor-not-allowed"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Conteúdo Premium
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Faça login para acessar o conteúdo premium
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => copyImage(getImageUrl(image))}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
                      >
                        {copiedUrl === getImageUrl(image) ? (
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
                      <button
                        onClick={() => shareImage(image)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-900 dark:bg-green-700 dark:hover:bg-green-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Compartilhar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && renderPagination()}
        </div>
      </main>

      {editingImage && (
        <ImageEditor
          imageUrl={editingImage.url}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveEdit}
        />
      )}

      {showLoginForm && (
        <LoginForm
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          handleLogin={handleLogin}
          loginError={loginError}
          setShowLoginForm={setShowLoginForm}
        />
      )}
    </div>
  );
}

export default App;