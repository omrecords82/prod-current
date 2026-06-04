import { Box, Typography, Grid, Container, Link } from '@mui/material';
import { styled } from '@mui/material/styles';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import JsonLd from '@/components/seo/JsonLd';

// Keys are emitted from server/src/routes/i18n.js (ENGLISH_DEFAULTS).
// Numbered q1..qN / a1..aN — sequential. Adding a new pair = bump this list
// AND add the key+value in i18n.js.
const FAQ_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

const FAQ_CATEGORIES: { labelKey: string; keys: readonly (typeof FAQ_KEYS)[number][] }[] = [
  { labelKey: 'faq.cat_setup', keys: ['3'] },
  { labelKey: 'faq.cat_records', keys: ['4', '5', '7', '9'] },
  { labelKey: 'faq.cat_security', keys: ['8', '10'] },
  { labelKey: 'faq.cat_pricing', keys: ['1', '2'] },
  { labelKey: 'faq.cat_support', keys: ['6'] },
];

const FAQ = () => {
  const theme = useTheme();
  const { t } = useLanguage();

  const [expandedKey, setExpandedKey] = useState<string | null>(FAQ_KEYS[0]);

  const StyledAccordian = styled(Accordion)(() => ({
    borderRadius: '8px',
    marginBottom: '16px !important',
    boxShadow: theme.palette.mode == 'light' ? '0px 3px 0px rgba(235, 241, 246, 0.25)' : 'unset',
    border: `1px solid ${theme.palette.divider}`,
    '&:before': {
      display: 'none',
    },
    '&.Mui-expanded': {
      margin: '0',
    },
    '& .MuiAccordionSummary-root': {
      padding: '8px 24px',
      minHeight: '60px',
      fontSize: '18px',
      fontWeight: 500,
    },
    '& .MuiAccordionDetails-root': {
      padding: '0 24px 24px',
    },
  }));

  const handleChange = (key: string) => () => {
    setExpandedKey((current) => (current === key ? null : key));
  };

  // Build FAQPage schema from the live translations. Skip any entry whose
  // q/a pair hasn't been translated yet (t() returns the key unchanged on miss).
  const mainEntity = FAQ_KEYS.map((k) => {
    const question = t(`faq.q${k}`);
    const answer = t(`faq.a${k}`);
    if (question === `faq.q${k}` || answer === `faq.a${k}`) return null;
    return {
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    };
  }).filter(Boolean);

  return (
    (<Container
      maxWidth="lg"
      sx={{
        pb: {
          xs: '30px',
          lg: '60px',
        },
      }}
    >
      {mainEntity.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity,
          }}
        />
      )}
      <Grid container spacing={3} justifyContent="center">
        <Grid
          size={{
            xs: 12,
            lg: 8
          }}>
          <Typography
            variant="h4"
            textAlign="center"
            lineHeight="1.2"
            sx={{
              fontSize: {
                lg: '40px',
                xs: '35px',
              },
            }}
            fontWeight="700"
          >
            {t('faq.accordion_title')}
          </Typography>
          <Box mt={7}>
            {FAQ_CATEGORIES.map((category) => {
              const items = category.keys.filter((k) => {
                const question = t(`faq.q${k}`);
                const answer = t(`faq.a${k}`);
                return question !== `faq.q${k}` && answer !== `faq.a${k}`;
              });
              if (items.length === 0) return null;
              return (
                <Box key={category.labelKey} mb={4}>
                  <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                      fontFamily: 'Georgia, serif',
                      fontWeight: 600,
                      mb: 2,
                      color: 'text.primary',
                    }}
                  >
                    {t(category.labelKey)}
                  </Typography>
                  {items.map((k) => {
                    const question = t(`faq.q${k}`);
                    const answer = t(`faq.a${k}`);
                    const isOpen = expandedKey === k;
                    return (
                      <StyledAccordian
                        key={k}
                        expanded={isOpen}
                        onChange={handleChange(k)}
                      >
                        <AccordionSummary
                          expandIcon={
                            isOpen ? (
                              <IconMinus size="21" stroke="1.5" />
                            ) : (
                              <IconPlus size="21" stroke="1.5" />
                            )
                          }
                          aria-controls={`panel${k}-content`}
                          id={`panel${k}-header`}
                        >
                          {question}
                        </AccordionSummary>
                        <AccordionDetails>{answer}</AccordionDetails>
                      </StyledAccordian>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Grid>
      </Grid>
      <Grid container spacing={3} justifyContent="center">
        <Grid
          size={{
            xs: 12,
            lg: 5
          }}>
          <Box
            mt={5}
            borderRadius="8px"
            display="inline-flex"
            justifyContent="center"
            gap="4px"
            alignItems="center"
            fontWeight={500}
            sx={{
              border: `1px dashed ${theme.palette.divider}`,
              padding: '7px 10px',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
              },
            }}
          >
            <Typography>{t('faq.still_question')}</Typography>
            <Link
              href="https://discord.com/invite/XujgB8ww4n"
              color="inherit"
              underline="always"
              sx={{
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {t('faq.email_us')}{' '}
            </Link>
            <Typography>{t('faq.or')}</Typography>
            <Link
              href="/support/"
              color="inherit"
              underline="always"
              sx={{
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {t('faq.submit_ticket')}
            </Link>
            .
          </Box>
        </Grid>
      </Grid>
    </Container>)
  );
};
export default FAQ;
