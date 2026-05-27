import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Camera, Tag, DollarSign, FileText, CheckCircle2, Loader2, Image as ImageIcon, Settings, Maximize, Layers } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface UploadArtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (artwork: any) => void;
  editingArt?: any;
}

import API_URL from '../config';

const UploadArtModal = ({ isOpen, onClose, onUploadSuccess, editingArt }: UploadArtModalProps) => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'USD',
    category: 'Arte',
    status: 'sale',
    dimensions: '',
    technique: ''
  });

  const isEditing = !!editingArt;

  useEffect(() => {
    if (editingArt) {
      setFormData({
        title: editingArt.title || '',
        description: editingArt.description || '',
        price: editingArt.price?.toString().replace(/[^\d.]/g, '') || '',
        currency: editingArt.currency || 'USD',
        category: editingArt.category || 'Arte',
        status: editingArt.status || 'sale',
        dimensions: editingArt.dimensions || '',
        technique: editingArt.technique || ''
      });
      
      const fetchExtraImages = async () => {
        try {
          const response = await fetch(`${API_URL}/api/art/${editingArt.id}`);
          if (response.ok) {
            const data = await response.json();
            const allImages = [data.main_image_url, ...(data.extra_images?.map((img: any) => img.image_url) || [])];
            setPreviews(allImages);
          } else {
            setPreviews([editingArt.image]);
          }
        } catch (err) {
          console.error("Error fetching extra images:", err);
          setPreviews([editingArt.image]);
        }
      };

      fetchExtraImages();
    } else {
      setFormData({
        title: '',
        description: '',
        price: '',
        currency: 'USD',
        category: 'Arte',
        status: 'venta',
        dimensions: '',
        technique: ''
      });
      setPreviews([]);
    }
  }, [editingArt, isOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (previews.length + files.length > 5) {
      alert("Máximo 5 fotos por obra");
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previews.length === 0) return;
    
    setLoading(true);
    
    try {
      // 1. Upload all images to Cloudinary that are not already URLs
      const uploadedUrls = await Promise.all(
        previews.map(async (preview) => {
          if (preview.startsWith('http')) return preview;
          
          const formDataToCloudinary = new FormData();
          formDataToCloudinary.append('file', preview);
          formDataToCloudinary.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
              method: 'POST',
              body: formDataToCloudinary,
            }
          );

          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message || 'Error en la subida');
          
          return data.secure_url.replace('/upload/', '/upload/c_fill,g_auto,w_1200,h_1500,f_auto,q_auto/');
        })
      );

      const mainImageUrl = uploadedUrls[0];
      const extraImages = uploadedUrls.slice(1);

      // 2. Save to database
      const token = localStorage.getItem('token');
      const url = isEditing 
        ? `${API_URL}/api/art/${editingArt.id}`
        : `${API_URL}/api/art`;
      
      const apiResponse = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          price: formData.price === '' ? null : parseFloat(formData.price),
          status: formData.status,
          category: formData.category,
          main_image_url: mainImageUrl,
          extra_images: extraImages,
          currency: formData.currency,
          dimensions: formData.dimensions,
          technique: formData.technique
        })
      });

      if (!apiResponse.ok) throw new Error('Error al guardar en la base de datos');

      const savedArt = await apiResponse.json();

      const resultArt = {
        id: savedArt.id,
        title: savedArt.title,
        price: savedArt.price ? `${savedArt.currency} ${savedArt.price}` : 'Consultar',
        status: savedArt.status,
        image: savedArt.main_image_url,
        description: savedArt.description,
        category: savedArt.category,
        currency: savedArt.currency,
        dimensions: savedArt.dimensions,
        technique: savedArt.technique
      };

      setLoading(false);
      setSuccess(true);
      
      setTimeout(() => {
        onUploadSuccess(resultArt);
        handleClose();
      }, 1500);
    } catch (error) {
      console.error("Error al procesar la obra:", error);
      alert("Error al guardar la obra. Verifica tu conexión.");
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setPreviews([]);
    setFormData({
      title: '',
      description: '',
      price: '',
      currency: 'USD',
      category: 'Arte',
      status: 'sale',
      dimensions: '',
      technique: ''
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-screen w-full md:w-[450px] bg-[#0a0a0a] border-l border-white/10 z-[201] overflow-y-auto no-scrollbar"
          >
            <div className="p-8 md:p-10 flex flex-col min-h-full">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-serif italic text-primary">
                    {isEditing ? 'Editar Obra' : 'Publicar Obra'}
                  </h2>
                  <p className="text-primary/40 text-[10px] uppercase tracking-widest mt-1">
                    {isEditing ? 'Perfecciona los detalles de tu creación' : 'Comparte tu visión con el mundo'}
                  </p>
                </div>
                <button 
                  onClick={handleClose}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors text-primary/50 hover:text-primary"
                >
                  <X size={24} />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {success ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex-1 flex flex-col items-center justify-center text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20">
                      <CheckCircle2 size={40} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif italic text-primary mb-2">
                        {isEditing ? '¡Cambios Guardados!' : '¡Obra Publicada!'}
                      </h3>
                      <p className="text-primary/40 text-sm">
                        {isEditing ? 'La información de tu obra ha sido actualizada.' : 'Tu obra ha sido añadida a tu galería exitosamente.'}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <form key="form" onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-8">
                    {/* Image Upload Area */}
                    <div className="space-y-4">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`relative aspect-video rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center cursor-pointer group hover:border-primary/30 transition-all overflow-hidden ${previews.length > 0 ? 'border-primary/20' : ''}`}
                      >
                        {previews.length > 0 ? (
                          <img src={previews[0]} alt="Principal" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-primary/30 group-hover:text-primary/60 transition-colors">
                            <div className="p-4 bg-white/5 rounded-full mb-4">
                              <Upload size={32} />
                            </div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em]">Subir Imágenes</p>
                            <p className="text-[10px] mt-2 text-primary/20">Máximo 5 fotos (JPG, PNG)</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                        />
                        {previews.length > 0 && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Camera size={24} className="text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Thumbnails */}
                      {previews.length > 0 && (
                        <div className="grid grid-cols-5 gap-2">
                          {previews.map((src, index) => (
                            <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group">
                              <img src={src} className="w-full h-full object-cover" />
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                              >
                                <X size={10} />
                              </button>
                              {index === 0 && (
                                <div className="absolute bottom-0 left-0 right-0 bg-primary/80 py-[2px] flex justify-center">
                                  <span className="text-[6px] text-black font-bold uppercase tracking-tighter">Portada</span>
                                </div>
                              )}
                            </div>
                          ))}
                          {previews.length < 5 && (
                            <button 
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="aspect-square rounded-lg border border-dashed border-white/10 bg-white/5 flex items-center justify-center text-primary/30 hover:bg-white/10 transition-colors"
                            >
                              <Upload size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-6">
                      {/* Title */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                          <Tag size={12} /> Título de la Obra
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="Ej: Ethereal Whisper"
                          className="w-full bg-transparent border-b border-white/10 py-3 text-primary outline-none focus:border-primary transition-colors font-serif italic text-lg placeholder:text-white/5"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                          <FileText size={12} /> Descripción
                        </label>
                        <textarea
                          placeholder="Describe la historia detrás de tu creación..."
                          className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-primary outline-none focus:border-primary/30 transition-colors text-sm min-h-[100px] resize-none"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                      </div>

                      {/* Segmented Control (Venta vs Exhibición) */}
                      <div className="space-y-3">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                          <Settings size={12} /> Propósito de la Obra
                        </label>
                        <div className="grid grid-cols-2 p-1 bg-white/[0.03] border border-white/5 rounded-xl relative overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, status: 'sale'})}
                            className={`relative z-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-lg ${formData.status === 'sale' ? 'text-black' : 'text-primary/40 hover:text-primary/70'}`}
                          >
                            Venta
                            {formData.status === 'sale' && (
                              <motion.div
                                layoutId="status-bg"
                                className="absolute inset-0 bg-primary rounded-lg -z-10"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, status: 'exhibition'})}
                            className={`relative z-10 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-lg ${formData.status === 'exhibition' ? 'text-black' : 'text-primary/40 hover:text-primary/70'}`}
                          >
                            Exhibición
                            {formData.status === 'exhibition' && (
                              <motion.div
                                layoutId="status-bg"
                                className="absolute inset-0 bg-primary rounded-lg -z-10"
                                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                              />
                            )}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {formData.status === 'sale' && (
                          <motion.div 
                            key="price-section"
                            initial={{ opacity: 0, height: 0, y: -20 }}
                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                            exit={{ opacity: 0, height: 0, y: -20 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="overflow-hidden"
                          >
                            <div className="grid grid-cols-2 gap-4 pb-2">
                              {/* Price */}
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                                  <DollarSign size={12} /> Precio
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Sin precio (Consultar)"
                                  className="w-full bg-transparent border-b border-white/10 py-3 text-primary outline-none focus:border-primary transition-colors font-bold text-lg placeholder:text-white/5"
                                  value={formData.price}
                                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                                />
                              </div>

                              {/* Currency */}
                              <div className="space-y-2">
                                <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                                  Moneda
                                </label>
                                <select
                                  className="w-full bg-transparent border-b border-white/10 py-3 text-primary outline-none focus:border-primary transition-colors text-sm appearance-none"
                                  value={formData.currency}
                                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                                >
                                  <option value="USD" className="bg-[#0a0a0a]">USD ($)</option>
                                  <option value="MXN" className="bg-[#0a0a0a]">MXN ($)</option>
                                  <option value="COP" className="bg-[#0a0a0a]">COP ($)</option>
                                  <option value="EUR" className="bg-[#0a0a0a]">EUR (€)</option>
                                  <option value="BTC" className="bg-[#0a0a0a]">BTC (₿)</option>
                                  <option value="ETH" className="bg-[#0a0a0a]">ETH (Ξ)</option>
                                </select>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Category */}
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                          <ImageIcon size={12} /> Categoría
                        </label>
                        <select
                          className={`w-full bg-transparent border-b border-white/10 py-3 text-primary outline-none focus:border-primary transition-colors text-sm appearance-none ${formData.status === 'exhibicion' ? 'mt-4' : ''}`}
                          value={formData.category}
                          onChange={(e) => setFormData({...formData, category: e.target.value})}
                        >
                          <option value="Arte" className="bg-[#0a0a0a]">Arte</option>
                        </select>
                      </div>

                      {/* Dimensions & Technique */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                            <Maximize size={12} /> Dimensiones
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: 100 x 120 cm"
                            className="w-full bg-transparent border-b border-white/10 py-3 text-primary outline-none focus:border-primary transition-colors text-sm placeholder:text-white/5"
                            value={formData.dimensions}
                            onChange={(e) => setFormData({...formData, dimensions: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-[0.2em] text-primary/40 font-bold flex items-center gap-2">
                            <Layers size={12} /> Técnica
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Óleo sobre lienzo"
                            className="w-full bg-transparent border-b border-white/10 py-3 text-primary outline-none focus:border-primary transition-colors text-sm placeholder:text-white/5"
                            value={formData.technique}
                            onChange={(e) => setFormData({...formData, technique: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 mt-auto">
                      <button
                        disabled={loading || previews.length === 0 || !formData.title}
                        type="submit"
                        className="w-full py-4 bg-primary text-black rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-[0_10px_40px_rgba(225,224,204,0.1)]"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          <>
                            {isEditing ? 'Guardar Cambios' : 'Publicar Ahora'}
                            <CheckCircle2 size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UploadArtModal;
