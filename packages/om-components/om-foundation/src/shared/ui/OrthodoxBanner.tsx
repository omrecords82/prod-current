/**
 * Orthodox Banner Component
 * 
 * A multilingual banner displaying the Orthodox Metrics branding
 * with translations in English, Greek, Russian, Romanian, and Georgian.
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Container } from '@mui/material';

// Language data
const languages = [
  { code: 'en', title: 'Orthodox\nMetrics', tagline: 'Recording the Saints Among Us' },
  { code: 'el', title: 'Ορθόδοξες\nΜετρήσεις', tagline: 'Καταγράφοντας τοὺς Ἁγίους ἀνάμεσά μας' },
  { code: 'ru', title: 'Православные\nМетрики', tagline: 'Записывая святых среди нас' },
  { code: 'ro', title: 'Metrici\nOrtodoxe', tagline: 'Înregistrăm sfinții din mijlocul nostru' },
  { code: 'ka', title: 'მართმადიდებლური\nმეტრიკა', tagline: 'ვაკონწილებთ ჩვენ შორის წმინდანებს' }
];

interface OrthodoxBannerProps {
  title?: string;
  subtitle?: string;
  showGradient?: boolean;
  autoRotate?: boolean;
  initialLanguage?: string;
  compact?: boolean;
}

const OrthodoxBanner: React.FC<OrthodoxBannerProps> = ({
  title,
  subtitle,
  showGradient = true,
  autoRotate = true,
  initialLanguage = 'en',
  compact = false
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    languages.findIndex(lang => lang.code === initialLanguage) || 0
  );

  useEffect(() => {
    if (!autoRotate) return;

    const rotateText = () => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % languages.length);
    };

    // Start rotation after 3 seconds, then every 4 seconds
    const initialTimeout = setTimeout(() => {
      rotateText();
      const interval = setInterval(rotateText, 4000);
      
      return () => clearInterval(interval);
    }, 3000);

    return () => clearTimeout(initialTimeout);
  }, [autoRotate]);

  const currentLanguage = languages[currentIndex];

  if (compact) {
    return (
      <Box
        sx={{
          background: showGradient 
            ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
            : 'transparent',
          py: 2,
          mb: 2,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              flexDirection: 'row',
              textAlign: 'center',
            }}
          >
            {/* Orthodox Cross Icon */}
            <Box
              sx={{
                position: 'relative',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Vertical beam */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: 0,
                  transform: 'translateX(-50%)',
                  width: 6,
                  height: 40,
                  bgcolor: '#F6C90E',
                }}
              />
              {/* Top bar */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: 6,
                  transform: 'translateX(-50%)',
                  width: 15,
                  height: 4,
                  bgcolor: '#F6C90E',
                }}
              />
              {/* Main bar */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: 15,
                  transform: 'translateX(-50%)',
                  width: 35,
                  height: 5,
                  bgcolor: '#F6C90E',
                }}
              />
              {/* Bottom bar (angled) */}
              <Box
                sx={{
                  position: 'absolute',
                  left: '50%',
                  top: 26,
                  transform: 'translateX(-50%) rotate(-20deg)',
                  width: 25,
                  height: 4,
                  bgcolor: '#F6C90E',
                }}
              />
            </Box>

            {/* Title - Multilingual */}
            <Box
              sx={{
                minWidth: 200,
                textAlign: 'center',
                position: 'relative',
                height: 50,
              }}
            >
              {languages.map((lang, index) => (
                <Typography
                  key={lang.code}
                  variant="h5"
                  sx={{
                    fontFamily: '"Noto Serif", "Times New Roman", serif',
                    fontWeight: 600,
                    color: '#4C1D95',
                    fontSize: '1.5rem',
                    lineHeight: 1.3,
                    whiteSpace: 'pre-line',
                    position: 'absolute',
                    width: '100%',
                    opacity: index === currentIndex ? 1 : 0,
                    transition: 'opacity 1s ease-in-out',
                  }}
                >
                  {title || lang.title}
                </Typography>
              ))}
            </Box>
          </Box>

          {subtitle && (
            <Typography
              variant="subtitle1"
              sx={{
                textAlign: 'center',
                mt: 1,
                color: 'text.secondary',
                fontWeight: 500,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: showGradient 
          ? 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
          : '#f8f9fa',
        py: 4,
        mb: 4,
        borderRadius: '0 0 20px 20px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Container maxWidth="md">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            flexDirection: 'row',
            textAlign: 'center',
            p: 4,
            bgcolor: 'white',
            borderRadius: 2,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          }}
        >
          {/* Orthodox Metrics Logo */}
          <Box
            sx={{
              position: 'relative',
              width: 300,
              height: 200,
              order: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box
              component="img"
              src="/images/incode/orthodox-metrics-logo.svg"
              alt="Orthodox Metrics"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
              onError={(e) => {
                // Fallback to text-based layout if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            
            {/* Fallback Text Layout */}
            <Box
              sx={{
                display: 'none',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                width: '100%',
              }}
            >
              {/* Orthodox Cross Icon */}
              <Box
                sx={{
                  position: 'relative',
                  width: 80,
                  height: 80,
                  filter: 'drop-shadow(0 4px 8px rgba(246, 201, 14, 0.3))',
                }}
              >
                {/* Vertical beam */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    transform: 'translateX(-50%)',
                    width: 12,
                    height: 80,
                    bgcolor: '#F6C90E',
                  }}
                />
                {/* Top bar */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 13,
                    transform: 'translateX(-50%)',
                    width: 30,
                    height: 8,
                    bgcolor: '#F6C90E',
                  }}
                />
                {/* Main bar */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 30,
                    transform: 'translateX(-50%)',
                    width: 70,
                    height: 10,
                    bgcolor: '#F6C90E',
                  }}
                />
                {/* Bottom bar (angled) */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: 53,
                    transform: 'translateX(-50%) rotate(-20deg)',
                    width: 50,
                    height: 8,
                    bgcolor: '#F6C90E',
                  }}
                />
              </Box>

              {/* Company Name - Multilingual */}
              <Box
                sx={{
                  minWidth: 280,
                  textAlign: 'center',
                  position: 'relative',
                  height: 70,
                }}
              >
                {languages.map((lang, index) => (
                  <Typography
                    key={lang.code}
                    variant="h4"
                    sx={{
                      fontFamily: '"Noto Serif", "Times New Roman", serif',
                      fontWeight: 600,
                      color: '#4C1D95',
                      fontSize: '1.8rem',
                      lineHeight: 1.3,
                      whiteSpace: 'pre-line',
                      position: 'absolute',
                      width: '100%',
                      opacity: index === currentIndex ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      textShadow: '0 2px 4px rgba(76, 29, 149, 0.2)',
                    }}
                  >
                    {title || lang.title}
                  </Typography>
                ))}
              </Box>

              {/* Tagline - Multilingual */}
              <Box
                sx={{
                  minWidth: 250,
                  textAlign: 'center',
                  position: 'relative',
                  height: 60,
                }}
              >
                {languages.map((lang, index) => (
                  <Typography
                    key={lang.code}
                    variant="h5"
                    sx={{
                      fontFamily: '"Noto Serif", "Times New Roman", serif',
                      fontStyle: 'italic',
                      color: '#F6C90E',
                      fontSize: '1.4rem',
                      position: 'absolute',
                      width: '100%',
                      opacity: index === currentIndex ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      textShadow: '0 2px 4px rgba(246, 201, 14, 0.3)',
                    }}
                  >
                    {lang.tagline}
                  </Typography>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {subtitle && (
          <Typography
            variant="h6"
            sx={{
              textAlign: 'center',
              mt: 2,
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Container>
    </Box>
  );
};

export default OrthodoxBanner;
