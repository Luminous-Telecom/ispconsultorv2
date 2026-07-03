import { SYSTEM_NAME, SYSTEM_TAGLINE } from 'constants/systemBrand';
import { useTheme } from 'contexts/ThemeContext';

export const useHomePage = () => {
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showContato, setShowContato] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const ctaButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxSrc(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [lightboxSrc]);

  useEffect(() => {
    if (!showContato) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ctaButtonsRef.current && !ctaButtonsRef.current.contains(e.target as Node)) {
        setShowContato(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showContato]);

  useEffect(() => {
    document.title = SYSTEM_NAME;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', `${SYSTEM_NAME} — ${SYSTEM_TAGLINE}`);
    }
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return {
    theme,
    toggleTheme,
    isMenuOpen,
    setIsMenuOpen,
    showContato,
    setShowContato,
    faqOpen,
    setFaqOpen,
    lightboxSrc,
    setLightboxSrc,
    ctaButtonsRef,
    scrollTo,
  };
};
