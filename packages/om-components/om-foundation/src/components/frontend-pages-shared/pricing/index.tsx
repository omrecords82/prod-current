import { Box, Grid, Typography, Container } from '@mui/material';
import PricingCard from './PricingCard.tsx';
import PaymentMethods from './PaymentMethods.tsx';

const Pricing = () => {
  return (<>
    <Box
      sx={{
        py: {
          xs: 5,
          lg: 11,
        },
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="center" justifyContent="center">
          <Grid
            size={{
              xs: 12,
              lg: 7
            }}>
            <Typography
              textAlign="center"
              variant="h4"
              lineHeight={1.4}
              mb={6}
              fontWeight={700}
              sx={{
                fontSize: {
                  lg: '40px',
                  xs: '35px',
                },
              }}
            >
               Dedicated staff to provide the solution that you want!
            </Typography>
          </Grid>
        </Grid>

        <PricingCard />

        <PaymentMethods />
      </Container>
    </Box>
  </>);
};

export default Pricing;
