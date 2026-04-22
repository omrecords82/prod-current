import Grid2 from '@/components/compat/Grid2';
import {
    Divider,
    Drawer,
    Fab,
    IconButton,
    Slider,
    Stack,
    styled,
    Tooltip,
    Typography
} from '@mui/material';
import { FC, useContext, useState } from 'react';

import Box, { BoxProps } from '@mui/material/Box';
import { useDraggableFab } from '@/hooks/useDraggableFab';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import Scrollbar from '@/components/custom-scroll/Scrollbar';
import { CustomizerContext } from '@/context/CustomizerContext';
import { BorderOuter, PaddingTwoTone, ViewComfyTwoTone } from '@mui/icons-material';
import AspectRatioTwoToneIcon from '@mui/icons-material/AspectRatioTwoTone';
import CallToActionTwoToneIcon from '@mui/icons-material/CallToActionTwoTone';
import DarkModeTwoToneIcon from '@mui/icons-material/DarkModeTwoTone';
import SwipeLeftAltTwoToneIcon from '@mui/icons-material/SwipeLeftAltTwoTone';
import SwipeRightAltTwoToneIcon from '@mui/icons-material/SwipeRightAltTwoTone';
import ViewSidebarTwoToneIcon from '@mui/icons-material/ViewSidebarTwoTone';
import WbSunnyTwoToneIcon from '@mui/icons-material/WbSunnyTwoTone';
import WebAssetTwoToneIcon from '@mui/icons-material/WebAssetTwoTone';
import { IconCheck, IconX } from '@tabler/icons-react';
import SvgIcon from '@mui/material/SvgIcon';

const ThreeBarCross: FC<{ stroke?: number }> = () => (
  <SvgIcon viewBox="0 0 24 24" sx={{ fontSize: 24 }}>
    {/* Eastern Orthodox three-bar cross (☦) — accurate proportions */}
    {/* Vertical staff */}
    <path d="M12 2v20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    {/* Top bar (titulus/INRI) — short */}
    <path d="M9.5 5.5h5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    {/* Middle bar (crossbeam/arms) — widest */}
    <path d="M6.5 9.5h11" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
    {/* Bottom bar (suppedaneum/footrest) — slanted left-high to right-low */}
    <path d="M8 15.5l8 4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
  </SvgIcon>
);

const SidebarWidth = "320px";
interface colors {
  id: number;
  bgColor: string;
  disp?: string;
}
const Customizer: FC = () => {
  const [showDrawer, setShowDrawer] = useState(false);
  const {
    activeDir,
    setActiveDir,
    activeMode,
    setActiveMode,
    isCollapse,
    setIsCollapse,
    activeTheme,
    activeLayout,
    setActiveLayout,
    isLayout,
    isCardShadow,
    setIsCardShadow,
    setIsLayout,
    isBorderRadius,
    setIsBorderRadius,
    setActiveTheme,
    headerBackground,
    setHeaderBackground
  } = useContext(CustomizerContext);

  const { dragProps, positionSx, wrapClick } = useDraggableFab({
    fabId: 'settings',
    defaultRight: 24,
    defaultBottom: 24,
  });


  const StyledBox = styled(Box)<BoxProps>(({ theme }) => ({
    boxShadow: theme.shadows[8],
    padding: "20px",
    cursor: "pointer",
    justifyContent: "center",
    display: "flex",
    transition: "0.1s ease-in",
    border: "1px solid rgba(145, 158, 171, 0.12)",
    "&:hover": {
      transform: "scale(1.05)",
    },
  }));

  const addAttributeToBody = (cvalue: any) => {
    document.body.setAttribute("data-color-theme", cvalue);
  };

  const thColors: colors[] = [
    {
      id: 1,
      bgColor: "#F5F5F0",
      disp: "WHITE_THEME",
    },
    {
      id: 2,
      bgColor: "#A4C639",
      disp: "GREEN_THEME",
    },
    {
      id: 3,
      bgColor: "#6B2D75",
      disp: "PURPLE_THEME",
    },
    {
      id: 4,
      bgColor: "#B22234",
      disp: "RED_THEME",
    },
    {
      id: 5,
      bgColor: "#1E6B8C",
      disp: "BLUE_THEME",
    },
    {
      id: 6,
      bgColor: "#C9A227",
      disp: "GOLD_THEME",
    },
    {
      id: 7,
      bgColor: "#1a1a1a",
      disp: "LENT_THEME",
    },
  ];




  return (
    (<div>
      {/* ------------------------------------------- */}
      {/* --Floating Button to open customizer ------ */}
      {/* ------------------------------------------- */}
      <Tooltip title="Settings">
        <Box
          ref={dragProps.ref}
          onMouseDown={dragProps.onMouseDown}
          onTouchStart={dragProps.onTouchStart}
          sx={{ ...positionSx, zIndex: 1300, display: 'inline-flex' }}
        >
          <Fab
            color="primary"
            aria-label="settings"
            onClick={wrapClick(() => setShowDrawer(true))}
          >
            <ThreeBarCross />
          </Fab>
        </Box>
      </Tooltip>
      <Drawer
        anchor="right"
        open={showDrawer}
        onClose={() => setShowDrawer(false)}
        PaperProps={{
          sx: {
            width: SidebarWidth,
          },
        }}
      >
        {/* ------------------------------------------- */}
        {/* ------------ Customizer Sidebar ------------- */}
        {/* ------------------------------------------- */}
        <Scrollbar sx={{ height: "calc(100vh - 5px)" }}>
          <Box
            p={2}
            display="flex"
            justifyContent={"space-between"}
            alignItems="center"
          >
            <Typography variant="h4">Settings</Typography>

            <IconButton color="inherit" onClick={() => setShowDrawer(false)}>
              <IconX size="1rem" />
            </IconButton>
          </Box>
          <Divider />
          <Box p={3}>
            {/* ------------------------------------------- */}
            {/* ------------ Dark light theme setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Option
            </Typography>
            <Stack direction={"row"} gap={2} my={2}>
              <StyledBox
                onClick={() => setActiveMode("light")}
                display="flex"
                gap={1}
              >
                <WbSunnyTwoToneIcon
                  color={
                    activeMode === "light" ? "primary" : "inherit"
                  }
                />
                Light
              </StyledBox>
              <StyledBox
                onClick={() => setActiveMode("dark")}
                display="flex"
                gap={1}
              >
                <DarkModeTwoToneIcon
                  color={
                    activeMode === "dark" ? "primary" : "inherit"
                  }
                />
                Dark
              </StyledBox>
            </Stack>

            <Box pt={3} />
            {/* ------------------------------------------- */}
            {/* ------------ RTL theme setting -------------*/}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Direction
            </Typography>
            <Stack direction={"row"} gap={2} my={2}>
              <StyledBox
                onClick={() => setActiveDir("ltr")}
                display="flex"
                gap={1}
              >
                <SwipeLeftAltTwoToneIcon
                  color={activeDir === "ltr" ? "primary" : "inherit"}
                />{" "}
                LTR
              </StyledBox>
              <StyledBox
                onClick={() => setActiveDir("rtl")}
                display="flex"
                gap={1}
              >
                <SwipeRightAltTwoToneIcon
                  color={activeDir === "rtl" ? "primary" : "inherit"}
                />{" "}
                RTL
              </StyledBox>
            </Stack>

            <Box pt={3} />
            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Colors
            </Typography>
            <Grid2 container spacing={2}>
              {thColors.map((thcolor) => (
                <Grid2 key={thcolor.id} size={4}>
                  <StyledBox onClick={() => addAttributeToBody(thcolor.disp)}>
                    <Tooltip title={`${thcolor.disp}`} placement="top">
                      <Box
                        sx={{
                          backgroundColor: thcolor.bgColor,
                          width: "25px",
                          height: "25px",
                          borderRadius: "60px",
                          alignItems: "center",
                          justifyContent: "center",
                          display: "flex",
                          color: "white",
                        }}
                        aria-label={`${thcolor.bgColor}`}
                        onClick={() => setActiveTheme(thcolor.disp)}
                      >
                        {activeTheme === thcolor.disp ? (
                          <IconCheck width={13} />
                        ) : (
                          ""
                        )}
                      </Box>
                    </Tooltip>
                  </StyledBox>


                </Grid2>
              ))}
            </Grid2>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Layout Horizontal / Vertical ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Layout Type
            </Typography>
            <Stack direction={"row"} gap={2} my={2}>
              <StyledBox
                onClick={() => setActiveLayout("vertical")}
                display="flex"
                gap={1}
              >
                <ViewComfyTwoTone
                  color={
                    activeLayout === 'vertical' ? "primary" : "inherit"
                  }
                />
                Vertical
              </StyledBox>
              <StyledBox
                onClick={() => setActiveLayout("horizontal")}
                display="flex"
                gap={1}
              >
                <PaddingTwoTone
                  color={
                    activeLayout === 'horizontal' ? "primary" : "inherit"
                  }
                />
                Horizontal
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Layout Boxed / Full ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Container Option
            </Typography>
            <Stack direction={"row"} gap={2} my={2}>
              <StyledBox
                onClick={() => setIsLayout("boxed")}
                display="flex"
                gap={1}
              >
                <CallToActionTwoToneIcon
                  color={
                    isLayout === "boxed" ? "primary" : "inherit"
                  }
                />
                Boxed
              </StyledBox>
              <StyledBox
                onClick={() => setIsLayout("full")}
                display="flex"
                gap={1}
              >
                <AspectRatioTwoToneIcon
                  color={isLayout === "full" ? "primary" : "inherit"}
                />
                Full
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Sidebar Color setting ------------- */}
            {/* ------------------------------------------- */}

            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            {activeLayout === "horizontal" ? (
              ""
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Sidebar Type
                </Typography>
                <Stack direction={"row"} gap={2} my={2}>
                  <StyledBox
                    onClick={() => {
                      setIsCollapse('full-sidebar')
                    }}
                    display="flex"
                    gap={1}
                  >
                    <WebAssetTwoToneIcon
                      color={isCollapse === "full-sidebar" ? "primary" : "inherit"}
                    />
                    Full
                  </StyledBox>
                  <StyledBox
                    onClick={() => setIsCollapse("mini-sidebar")}
                    display="flex"
                    gap={1}
                  >
                    <ViewSidebarTwoToneIcon
                      color={isCollapse === "mini-sidebar" ? "primary" : "inherit"}
                    />
                    mini
                  </StyledBox>
                </Stack>
              </>
            )}
            <Box pt={4} />
            <Typography variant="h6" gutterBottom>
              Card With
            </Typography>
            <Stack direction={"row"} gap={2} my={2}>
              <StyledBox
                onClick={() => setIsCardShadow(false)}
                display="flex"
                gap={1}
              >
                <BorderOuter
                  color={!isCardShadow ? "primary" : "inherit"}
                />
                Border
              </StyledBox>
              <StyledBox
                onClick={() => setIsCardShadow(true)}
                display="flex"
                gap={1}
              >
                <CallToActionTwoToneIcon
                  color={isCardShadow ? "primary" : "inherit"}
                />
                Shadow
              </StyledBox>
            </Stack>
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Theme Color setting ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Theme Border Radius
            </Typography>

            <Slider
              size="small"
              value={isBorderRadius}
              aria-label="Small"
              min={4}
              max={24}
              onChange={(event: any) => setIsBorderRadius(event.target.value)}
              valueLabelDisplay="auto"
            />
            <Box pt={4} />
            {/* ------------------------------------------- */}
            {/* ------------ Header Background ------------- */}
            {/* ------------------------------------------- */}
            <Typography variant="h6" gutterBottom>
              Header Background
            </Typography>
            <Grid2 container spacing={2} my={2}>
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <Grid2 key={`header-bg-${num}`} size={4}>
                  <StyledBox 
                    onClick={() => setHeaderBackground(num)}
                    sx={{
                      position: 'relative',
                      minHeight: '60px',
                      backgroundColor: 'rgba(0,0,0,0.2)', // Fallback background
                      backgroundImage: `url(/images/bgtiled${num}.png)`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'repeat',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        zIndex: 0,
                      }
                    }}
                  >
                    {headerBackground === num && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          backgroundColor: 'primary.main',
                          borderRadius: '50%',
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                        }}
                      >
                        <IconCheck width={16} color="white" />
                      </Box>
                    )}
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        position: 'absolute',
                        bottom: 4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        zIndex: 2,
                        fontWeight: 'bold',
                      }}
                    >
                      {num}
                    </Typography>
                  </StyledBox>
                </Grid2>
              ))}
            </Grid2>
          </Box>
        </Scrollbar>
      </Drawer>
    </div>)
  );
};

export default Customizer;
