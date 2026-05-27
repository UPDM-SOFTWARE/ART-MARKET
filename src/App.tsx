import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ArtGallery from './components/ArtGallery';
import ArtistInvite from './components/ArtistInvite';
import About from './components/About';
import Features from './components/Features';
import CustomCursor from './components/CustomCursor';
import ContactModal from './components/ContactModal';
import AuthModal from './components/AuthModal';
import MyArt from './components/MyArt';
import ArtMarket from './components/ArtMarket';
import ArtDetail from './components/ArtDetail';
import { useState, useEffect } from 'react';

function App() {
  const [showContact, setShowContact] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [cursorStatus, setCursorStatus] = useState<'default' | 'success' | 'error' | 'loading'>('default');
  const [currentView, setCurrentView] = useState<'home' | 'my-art' | 'market' | 'gallery' | 'art-detail'>('home');
  const [previousView, setPreviousView] = useState<'home' | 'my-art' | 'market' | 'gallery'>('home');
  const [selectedArtId, setSelectedArtId] = useState<string | null>(null);

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (token && userData) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleViewArt = (id: string) => {
    setPreviousView(currentView as any);
    setSelectedArtId(id);
    setCurrentView('art-detail');
  };

  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Art Market | Home',
      'my-art': 'Art Market | Mis Obras',
      market: 'Art Market | Mercado de Arte',
      gallery: 'Art Market | Galería'
    };
    if (titles[currentView]) {
      document.title = titles[currentView];
    }
  }, []);

  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Art Market | Home',
      'my-art': 'Art Market | Mis Obras',
      market: 'Art Market | Mercado de Arte',
      gallery: 'Art Market | Galería'
    };
    if (titles[currentView]) {
      document.title = titles[currentView];
    }
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <>
            <Hero onExplore={() => setCurrentView('market')} onPublish={() => setCurrentView('my-art')} />
            <ArtGallery onArtClick={handleViewArt} />
            <ArtistInvite />
            <About />
            <Features />
          </>
        );
      case 'market':
        return <ArtMarket onArtClick={handleViewArt} />;
      case 'gallery':
        return <ArtGallery onArtClick={handleViewArt} />;
      case 'art-detail':
        return selectedArtId ? (
          <ArtDetail
            artId={selectedArtId}
            onBack={() => setCurrentView(previousView)}
          />
        ) : <Hero onExplore={() => setCurrentView('market')} onPublish={() => setCurrentView('my-art')} />;
      case 'my-art':
        return isLoggedIn ? (
          <MyArt
            user={user}
            onArtClick={handleViewArt}
            onUpdateUser={(updatedUser: any) => {
              setUser(updatedUser);
              const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
              storage.setItem('user', JSON.stringify(updatedUser));
            }}
          />
        ) : (
          <>
            <Hero onExplore={() => setCurrentView('market')} onPublish={() => setCurrentView('my-art')} />
            <ArtGallery onArtClick={handleViewArt} />
            <ArtistInvite />
            <About />
            <Features />
          </>
        );
      default:
        return <Hero onExplore={() => setCurrentView('market')} onPublish={() => setCurrentView('my-art')} />;
    }
  };

  return (
    <main className="bg-black min-h-screen">
      <CustomCursor status={cursorStatus} />
      <Navbar
        onContactClick={() => setShowContact(true)}
        onProfileClick={() => setShowAuth(true)}
        onViewChange={(view: any) => setCurrentView(view)}
        isLoggedIn={isLoggedIn}
        user={user}
        currentView={currentView as any}
      />
      <ContactModal isOpen={showContact} onClose={() => setShowContact(false)} />

      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        isLoggedIn={isLoggedIn}
        onLogin={(userData) => {
          setIsLoggedIn(true);
          setUser(userData);
          setCursorStatus('success');
          setTimeout(() => setCursorStatus('default'), 2000);
          setShowAuth(false);
        }}
        onLogout={() => {
          setIsLoggedIn(false);
          setUser(null);
          setCurrentView('home');
          setShowAuth(false);
        }}
        onError={() => {
          setCursorStatus('error');
          setTimeout(() => setCursorStatus('default'), 2000);
        }}
        onGoToProfile={() => {
          setCurrentView('my-art');
          setShowAuth(false);
        }}
      />

      {renderContent()}

      {/* Footer / Simple spacing at the end */}
      <footer className="bg-black py-12 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-primary/50 text-xs tracking-widest uppercase">
            © 2026 Art Market
          </p>
          <div className="flex gap-8">
            {['Instagram', 'Twitter', 'Vimeo', 'LinkedIn'].map((social) => (
              <a key={social} href="#" className="text-primary/50 hover:text-primary text-xs transition-colors">
                {social}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}

export default App;