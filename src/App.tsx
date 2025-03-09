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
              <a
                href="https://www.behance.net/tamaraaraujodesigner"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400 transition-colors"
              >
                <svg className="h-6 w-6" viewBox="0 0 485 485" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <g>
                    <path d="M204.235,334.302c8.256-2.17,15.627-5.503,22.044-10.048c6.366-4.505,11.532-10.343,15.326-17.546 c3.758-7.113,5.64-15.574,5.64-25.399c0-12.122-2.881-22.46-8.766-31.101c-5.856-8.583-14.686-14.618-26.613-18.045 c8.759-4.142,15.312-9.477,19.773-15.98c4.426-6.513,6.639-14.661,6.639-24.414c0-9.017-1.48-16.644-4.434-22.734 c-3.025-6.182-7.249-11.09-12.645-14.78c-5.482-3.689-11.971-6.38-19.572-7.993c-7.645-1.656-16.008-2.458-25.277-2.458H85v193.759 h93.915C187.595,337.564,196.074,336.472,204.235,334.302z M127.665,176.809h39.913c3.772,0,7.458,0.269,10.972,0.956 c3.578,0.614,6.661,1.753,9.391,3.402c2.752,1.584,4.929,3.847,6.574,6.739c1.589,2.892,2.379,6.618,2.379,11.126 c0,8.119-2.379,14.04-7.286,17.621c-4.957,3.639-11.216,5.432-18.774,5.432h-43.168V176.809z M127.665,304.563v-53.356h46.379 c9.183,0,16.648,2.112,22.245,6.358c5.59,4.308,8.399,11.396,8.399,21.383c0,5.094-0.826,9.312-2.55,12.559 c-1.717,3.276-4.081,5.852-6.934,7.731c-2.853,1.954-6.237,3.276-10.052,4.11c-3.758,0.841-7.753,1.214-11.963,1.214H127.665z"></path>
                    <path d="M279.111,320.797c6.272,6.517,13.73,11.518,22.654,15.085c8.931,3.524,18.875,5.313,29.926,5.313 c15.857,0,29.466-3.632,40.624-10.921c11.287-7.257,19.564-19.313,25.018-36.202h-33.935c-1.315,4.343-4.713,8.525-10.296,12.437 c-5.633,3.916-12.351,5.881-20.125,5.881c-10.807,0-19.148-2.834-24.917-8.471c-5.792-5.636-9.542-16.137-9.542-27.227h101.237 c0.726-10.885-0.157-21.282-2.68-31.234c-2.544-9.969-6.611-18.857-12.33-26.628c-5.719-7.785-12.998-14.004-21.878-18.592 c-8.91-4.652-19.307-6.937-31.176-6.937c-10.749,0-20.456,1.911-29.258,5.709c-8.802,3.811-16.36,9.031-22.733,15.645 c-6.359,6.578-11.194,14.421-14.694,23.509c-3.427,9.057-5.18,18.857-5.18,29.348c0,10.849,1.689,20.861,5.037,29.905 C268.247,306.51,272.996,314.249,279.111,320.797z M300.278,243.159c0.984-3.502,2.68-6.778,5.166-9.883 c2.5-3.054,5.77-5.648,9.757-7.731c4.081-2.112,9.175-3.147,15.332-3.147c9.463,0,17.223,2.741,21.8,7.81 c4.598,5.108,7.961,12.372,8.881,22.198h-62.697C298.697,249.669,299.287,246.572,300.278,243.159z"></path>
                    <rect x="290.636" y="156.802" width="78.54" height="19.12"></rect>
                    <path d="M0,0v485h485V0H0z M455,455H30V30h425V455z"></path>
                  </g>
                </svg>
              </a>
              <a
                href="https://designertamara.myportfolio.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-pink-600 dark:text-gray-300 dark:hover:text-pink-400 transition-colors"
              >
                <svg className="h-6 w-6" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="54 48 10 48 8 22 56 22 54 48"></polygon>
                  <polyline points="12 22 12 12 22 12 26 16 52 16 52 22"></polyline>
                </svg>
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