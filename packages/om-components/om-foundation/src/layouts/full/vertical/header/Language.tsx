// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { useContext } from 'react';
import { Avatar, IconButton, Menu, MenuItem, Typography, Stack } from '@mui/material';
import FlagUs from '@/assets/images/flag/icon-flag-us.svg';
import FlagGr from '@/assets/images/flag/icon-flag-gr.svg';
import FlagRo from '@/assets/images/flag/icon-flag-ro.svg';
import FlagRu from '@/assets/images/flag/icon-flag-ru.svg';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';

import { CustomizerContext } from '@/context/CustomizerContext';

const Languages = [
  {
    flagname: 'English (US)',
    icon: FlagUs,
    value: 'en',
  },
  {
    flagname: 'Ελληνικά (Greek)',
    icon: FlagGr,
    value: 'gr',
  },
  {
    flagname: 'Română (Romanian)',
    icon: FlagRo,
    value: 'ro',
  },
  {
    flagname: 'Русский (Russian)',
    icon: FlagRu,
    value: 'ru',
  },
];

const Language = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);
  const { isLanguage, setIsLanguage } = useContext(CustomizerContext);

  const currentLang =
    Languages.find((_lang) => _lang.value === isLanguage) || Languages[0];
  const { i18n } = useTranslation();
  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  useEffect(() => {
    i18n.changeLanguage(isLanguage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <IconButton
        aria-label="more"
        id="long-button"
        aria-controls={open ? 'long-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
      >
        <Avatar src={currentLang.icon} alt={currentLang.value} sx={{ width: 20, height: 20 }} />
      </IconButton>
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        sx={{
          '& .MuiMenu-paper': {
            width: '200px',
          },
        }}
      >
        {Languages.map((option, index) => (
          <MenuItem
            key={index}
            sx={{ py: 2, px: 3 }}
            onClick={() => setIsLanguage(option.value)}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar src={option.icon} alt={option.icon} sx={{ width: 20, height: 20 }} />
              <Typography> {option.flagname}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default Language;
