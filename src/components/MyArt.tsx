import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Edit2, Share2, Grid, Heart, MessageSquare, Settings, User, Palette, Check, X, Loader2, Trash2, Eye, Instagram, Facebook, Twitter } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import UploadArtModal from './UploadArtModal';
import DeleteConfirmModal from './DeleteConfirmModal';

import API_URL from '../config';
import { getAuthToken, notifySessionExpired } from '../utils/auth';

const MyArt = ({ user, onUpdateUser, onArtClick }: { user: any, onUpdateUser: (u: any) => void, onArtClick: (id: string) => void }) => {
  const [activeTab, setActiveTab] = useState('Vista General');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    full_name: user?.full_name || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
    whatsapp: user?.whatsapp || '',
    instagram: user?.instagram || '',
    twitter: user?.twitter || '',
    facebook: user?.facebook || '',
    tiktok: user?.tiktok || '',
    personal_web: user?.personal_web || ''
  });
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);

  // Mock data for the gallery
  const [artworks, setArtworks] = useState([]);
  const [editingArt, setEditingArt] = useState<any>(null);
  const [artToDelete, setArtToDelete] = useState<any>(null);
  const [isDeletingArt, setIsDeletingArt] = useState(false);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchArt = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          setArtworks([]);
          return;
        }
        const response = await fetch(`${API_URL}/api/art/my`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.status === 401 || response.status === 403) {
          notifySessionExpired();
          return;
        }
        if (response.ok) {
          const data = await response.json();
          // Adaptar formato si es necesario
          const adaptedArt = data.map((art: any) => ({
            id: art.id,
            title: art.title,
            price: art.price ? `${art.currency || '$'} ${art.price}` : 'Consultar',
            status: art.status,
            image: art.main_image_url
          }));
          setArtworks(adaptedArt);
        }
      } catch (err) {
        console.error("Error fetching art:", err);
      }
    };

    fetchArt();
  }, [user]);

  const handleUploadSuccess = (newOrUpdatedArt: any) => {
    setArtworks(prev => {
      const index = prev.findIndex((a: any) => a.id === newOrUpdatedArt.id);
      if (index !== -1) {
        // Actualización
        const updated = [...prev];
        updated[index] = newOrUpdatedArt;
        return updated;
      } else {
        // Nueva obra
        return [newOrUpdatedArt, ...prev];
      }
    });
    setEditingArt(null);
  };

  const handleEditArt = (art: any) => {
    setEditingArt(art);
    setShowUploadModal(true);
  };

  const handleDeleteArt = (art: any) => {
    setArtToDelete(art);
  };

  const confirmDeleteArt = async () => {
    if (!artToDelete) return;

    const token = getAuthToken();
    if (!token) {
      notifySessionExpired();
      alert("Tu sesión ha expirado o no has iniciado sesión. Por favor inicia sesión nuevamente.");
      return;
    }

    setIsDeletingArt(true);
    try {
      const response = await fetch(`${API_URL}/api/art/${artToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401 || response.status === 403) {
        notifySessionExpired();
        alert("Tu sesión ha expirado o no tienes autorización. Por favor inicia sesión nuevamente.");
        return;
      }

      if (response.ok) {
        setArtworks(prev => prev.filter((a: any) => a.id !== artToDelete.id));
        setArtToDelete(null);
      } else {
        const data = await response.json();
        alert(data.message || "Error al eliminar la obra");
      }
    } catch (err) {
      console.error("Error deleting art:", err);
      alert("Error de conexión al eliminar la obra");
    } finally {
      setIsDeletingArt(false);
    }
  };

  const handleSaveProfile = async () => {
    if (editData.whatsapp && !editData.whatsapp.match(/^\+\d{10,15}$/)) {
      alert("El número de WhatsApp debe incluir código de país (ej. +52) y contener entre 10 y 15 dígitos.");
      return;
    }

    const token = getAuthToken();
    if (!token) {
      notifySessionExpired();
      alert("Tu sesión ha expirado o no has iniciado sesión. Por favor inicia sesión nuevamente.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });

      if (response.status === 401 || response.status === 403) {
        notifySessionExpired();
        alert("Tu sesión ha expirado o no tienes autorización. Por favor inicia sesión nuevamente.");
        return;
      }

      if (response.ok) {
        const updatedUser = await response.json();
        onUpdateUser(updatedUser);
        setIsEditing(false);
      } else {
        console.error("Error updating profile");
      }
    } catch (err) {
      console.error("Error saving profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProfile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Optimized profile picture URL
        const optimizedUrl = data.secure_url.replace('/upload/', '/upload/c_fill,g_face,w_400,h_400,f_auto,q_auto/');
        setEditData({ ...editData, avatar_url: optimizedUrl });
      }
    } catch (err) {
      console.error("Error uploading profile picture:", err);
    } finally {
      setIsUploadingProfile(false);
    }
  };

  const filteredArtworks = artworks.filter(art => {
    if (activeTab === 'Vista General') return true;
    if (activeTab === 'En Venta') return art.status === 'sale';
    if (activeTab === 'Exhibición') return art.status === 'exhibition';
    return true;
  });

  const tabs = ['Vista General', 'En Venta', 'Exhibición'];

  return (
    <div className="min-h-screen bg-black p-2 md:p-6 relative">
      <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden bg-[#080808]">

        {/* Banner Section */}
        <div className="relative h-[35vh] min-h-[250px] w-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-[#080808] z-10" />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ duration: 1.5 }}
            className="w-full h-full bg-[#1a1a1a] bg-noise"
          />
        </div>

        {/* Profile Info Section */}
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 lg:px-16 relative pb-20">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-8 -mt-20 md:-mt-24 relative z-20">
            <div className="relative group">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-40 h-40 md:w-48 md:h-48 rounded-full border-[6px] border-[#080808] overflow-hidden bg-[#222] shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center relative"
              >
                {editData.avatar_url || user?.avatar_url ? (
                  <img
                    src={isEditing ? editData.avatar_url : (user?.avatar_url || editData.avatar_url)}
                    alt="Profile"
                    className={`w-full h-full object-cover ${isUploadingProfile ? 'opacity-30' : 'opacity-100'} transition-opacity`}
                  />
                ) : (
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-primary/50" fill="currentColor">
                    <path d="M35 35 L42 42 L35 49 L28 42 Z" />
                    <path d="M65 35 L72 42 L65 49 L58 42 Z" />
                    <path d="M30 65 Q50 85 70 65" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                )}

              </motion.div>
              {isEditing && (
                <>
                  <button
                    onClick={() => profileInputRef.current?.click()}
                    disabled={isUploadingProfile}
                    className="absolute bottom-2 right-2 p-3 bg-primary text-black rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:scale-110 transition-all z-50 border-4 border-[#080808]"
                  >
                    {isUploadingProfile ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Camera size={16} />
                    )}
                  </button>
                  {(editData.avatar_url || user?.avatar_url) && (
                    <button
                      onClick={() => setEditData({ ...editData, avatar_url: '' })}
                      className="absolute bottom-2 left-2 p-3 bg-red-500 text-white rounded-full shadow-[0_10px_30px_rgba(239,68,68,0.3)] hover:scale-110 transition-all z-50 border-4 border-[#080808]"
                      title="Eliminar foto de perfil"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </>
              )}
              <input
                type="file"
                ref={profileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleProfilePictureChange}
              />
            </div>

            {/* User Details & Actions Wrapper */}
            <div className="flex-1 flex flex-col lg:flex-row lg:items-end justify-between gap-6 w-full">
              {/* Name & Bio */}
              <div className="flex-1 w-full">
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-wrap items-center gap-4 mb-3"
                >
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.full_name}
                      onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                      placeholder="Tu Nombre de Artista"
                      className="text-4xl md:text-5xl font-serif italic font-bold text-[#e1e0cc] tracking-tight bg-transparent border-none outline-none w-full max-w-2xl transition-all placeholder:text-[#e1e0cc]/20 focus:ring-0 p-0 m-0 leading-tight transform translate-y-[2px]"
                      autoFocus
                    />
                  ) : (
                    <h1 className="text-4xl md:text-5xl font-serif italic font-bold text-[#e1e0cc] tracking-tight m-0 leading-tight">
                      {user?.full_name || user?.username || "Tu Nombre de Artista"}
                    </h1>
                  )}
                </motion.div>
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  {isEditing ? (
                    <div className="space-y-4 w-full max-w-2xl mt-4">
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        placeholder="Escribe aquí una breve descripción de tu estilo o tu biografía artística..."
                        className="text-primary/60 text-sm md:text-base leading-relaxed font-light italic bg-white/5 border border-white/10 rounded-xl p-4 w-full outline-none focus:ring-1 focus:ring-primary/30 min-h-[100px] resize-none transition-all placeholder:text-primary/10"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                          <Instagram size={16} className="text-primary/40" />
                          <input
                            type="text"
                            value={editData.instagram}
                            onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                            placeholder="Instagram (ej: @usuario)"
                            className="bg-transparent border-none outline-none text-sm text-primary/80 placeholder:text-primary/10 w-full p-0"
                          />
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                          <Facebook size={16} className="text-primary/40" />
                          <input
                            type="text"
                            value={editData.facebook}
                            onChange={(e) => setEditData({ ...editData, facebook: e.target.value })}
                            placeholder="Facebook URL"
                            className="bg-transparent border-none outline-none text-sm text-primary/80 placeholder:text-primary/10 w-full p-0"
                          />
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                          <MessageSquare size={16} className="text-primary/40" />
                          <input
                            type="tel"
                            value={editData.whatsapp}
                            onChange={(e) => setEditData({ ...editData, whatsapp: e.target.value })}
                            placeholder="WhatsApp (ej: +52...)"
                            className="bg-transparent border-none outline-none text-sm text-primary/80 placeholder:text-primary/10 w-full p-0"
                          />
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                          <Twitter size={16} className="text-primary/40" />
                          <input
                            type="text"
                            value={editData.twitter}
                            onChange={(e) => setEditData({ ...editData, twitter: e.target.value })}
                            placeholder="Twitter/X (ej: @usuario)"
                            className="bg-transparent border-none outline-none text-sm text-primary/80 placeholder:text-primary/10 w-full p-0"
                          />
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                          <Palette size={16} className="text-primary/40" />
                          <input
                            type="text"
                            value={editData.tiktok}
                            onChange={(e) => setEditData({ ...editData, tiktok: e.target.value })}
                            placeholder="TikTok (ej: @usuario)"
                            className="bg-transparent border-none outline-none text-sm text-primary/80 placeholder:text-primary/10 w-full p-0"
                          />
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                          <Eye size={16} className="text-primary/40" />
                          <input
                            type="text"
                            value={editData.personal_web}
                            onChange={(e) => setEditData({ ...editData, personal_web: e.target.value })}
                            placeholder="Sitio Web Personal"
                            className="bg-transparent border-none outline-none text-sm text-primary/80 placeholder:text-primary/10 w-full p-0"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex flex-wrap gap-4 pt-2">
                        {user?.instagram && (
                          <a href={`https://instagram.com/${user.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <Instagram size={14} /> {user.instagram.startsWith('@') ? user.instagram : `@${user.instagram}`}
                          </a>
                        )}
                        {user?.facebook && (
                          <a href={user.facebook.startsWith('http') ? user.facebook : `https://facebook.com/${user.facebook}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <Facebook size={14} /> FACEBOOK
                          </a>
                        )}
                        {user?.whatsapp && (
                          <a href={`https://wa.me/${user.whatsapp.replace('+', '').replace(' ', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <MessageSquare size={14} /> WHATSAPP
                          </a>
                        )}
                        {user?.twitter && (
                          <a href={`https://twitter.com/${user.twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <Twitter size={14} /> {user.twitter.startsWith('@') ? user.twitter : `@${user.twitter}`}
                          </a>
                        )}
                        {user?.tiktok && (
                          <a href={`https://tiktok.com/@${user.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <Share2 size={14} /> TIKTOK
                          </a>
                        )}
                        {user?.personal_web && (
                          <a href={user.personal_web.startsWith('http') ? user.personal_web : `https://${user.personal_web}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary/40 hover:text-primary transition-colors text-xs font-bold tracking-widest uppercase bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <Eye size={14} /> WEB
                          </a>
                        )}
                      </div>

                      <p className="text-primary/40 max-w-xl text-sm md:text-base leading-relaxed font-light italic m-0 border-l-2 border-primary/10 pl-6">
                        {user?.bio || "Escribe aquí una breve descripción de tu estilo o tu biografía artística..."}
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Actions */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-3"
              >
                {!isEditing && (
                  <button
                    onClick={() => {
                      setEditingArt(null);
                      setShowUploadModal(true);
                    }}
                    className="px-6 py-3 bg-primary text-black rounded-full hover:scale-105 transition-all text-[10px] font-bold tracking-[0.2em] flex items-center gap-2 shadow-[0_10px_30px_rgba(225,224,204,0.2)] whitespace-nowrap"
                  >
                    <Camera size={14} />
                    PUBLICAR OBRA
                  </button>
                )}

                {isEditing ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="p-3 bg-primary text-black rounded-full hover:scale-110 transition-all shadow-[0_10px_20px_rgba(225,224,204,0.2)] disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData({
                          full_name: user?.full_name || '',
                          bio: user?.bio || '',
                          avatar_url: user?.avatar_url || '',
                          whatsapp: user?.whatsapp || '',
                          instagram: user?.instagram || '',
                          twitter: user?.twitter || '',
                          facebook: user?.facebook || '',
                          tiktok: user?.tiktok || '',
                          personal_web: user?.personal_web || ''
                        });
                      }}
                      className="p-3 bg-white/5 border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-3 bg-white/5 border border-white/10 rounded-full text-primary/80 hover:text-primary hover:bg-white/10 transition-all backdrop-blur-md"
                  >
                    <Settings size={18} />
                  </button>
                )}

                {!isEditing && (
                  <button className="p-3 bg-white/5 border border-white/10 rounded-full text-primary/50 hover:text-primary transition-all">
                    <Share2 size={18} />
                  </button>
                )}
              </motion.div>
            </div>
          </div>

          <div className="mt-20 border-b border-white/5 flex gap-12 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-6 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative whitespace-nowrap ${activeTab === tab ? 'text-primary' : 'text-primary/30 hover:text-primary'}`}
              >
                {tab}
                {activeTab === tab && (
                  <motion.div layoutId="profile-tab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-full shadow-[0_-4px_10px_rgba(225,224,204,0.3)]" />
                )}
              </button>
            ))}
          </div>

          {/* Art Grid Header */}
          <div className="mt-16 flex justify-between items-center mb-10">
            <h2 className="text-xl font-serif italic text-[#e1e0cc]">
              {activeTab === 'Vista General' ? 'Todas las Obras' : activeTab}
            </h2>
            <div className="flex gap-2">
              <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-primary/50 hover:text-primary transition-colors">
                <Grid size={18} />
              </button>
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="mt-12 min-h-[400px] relative">
            <AnimatePresence mode="popLayout">
              {filteredArtworks.length > 0 ? (
                <motion.div
                  layout
                  className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-8 md:gap-y-12 w-full"
                >
                  {filteredArtworks.map((art, index) => (
                    <motion.div
                      key={art.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className="group"
                    >
                      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl mb-6 bg-white/[0.02] border border-white/[0.03]">
                        <img
                          src={art.image}
                          alt={art.title}
                          className="w-full h-full object-cover"
                        />

                        {/* Tags */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                          {art.status === 'sold' ? (
                            <div className="bg-red-500/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                              <span className="text-white text-[9px] font-black uppercase tracking-widest">Vendido</span>
                            </div>
                          ) : (
                            <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md border ${art.status === 'sale'
                              ? 'bg-primary/20 text-primary border-primary/20'
                              : 'bg-white/10 text-white/50 border-white/10'
                              }`}>
                              {art.status === 'sale' ? 'En Venta' : 'Exhibición'}
                            </div>
                          )}
                        </div>

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="absolute top-4 right-4 flex flex-col gap-2 transform -translate-y-2 group-hover:translate-y-0 transition-transform duration-300 pointer-events-auto">
                            <button
                              onClick={() => onArtClick(art.id)}
                              className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                              title="Ver detalles"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => handleEditArt(art)}
                              className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                              title="Editar obra"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteArt(art)}
                              className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                              title="Eliminar obra"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 px-1">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="text-[#e1e0cc] text-base md:text-xl font-serif italic font-medium truncate flex-1">{art.title}</h3>
                          <div className="flex flex-col items-end">
                            <span className="text-primary font-bold text-sm">
                              {art.status === 'sale' ? art.price : 'Exhibición'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-px bg-primary/20" />
                          <p className="text-primary/30 text-[10px] uppercase tracking-widest font-bold">Publicado por ti</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center text-center py-20"
                >
                  <div className="relative mb-6">
                    <motion.div
                      animate={{ opacity: [0.1, 0.2, 0.1] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute inset-0 bg-primary rounded-full blur-3xl"
                    />
                    <Palette size={48} className="text-primary/10 relative z-10" />
                  </div>
                  <h3 className="text-xl font-serif italic text-primary/60">Tu galería está vacía</h3>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-primary/20 mt-2">Aún no has publicado ninguna obra</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <UploadArtModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setEditingArt(null);
        }}
        onUploadSuccess={handleUploadSuccess}
        editingArt={editingArt}
      />

      <DeleteConfirmModal
        isOpen={!!artToDelete}
        onClose={() => setArtToDelete(null)}
        onConfirm={confirmDeleteArt}
        title={artToDelete?.title || ""}
        isLoading={isDeletingArt}
      />
    </div>
  );
};

export default MyArt;
