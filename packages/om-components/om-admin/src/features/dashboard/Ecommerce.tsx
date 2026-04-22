// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import Grid2 from '@/components/compat/Grid2';
// @ts-ignore
import React from 'react';
import { Box } from '@mui/material';
import Grid from '@/components/compat/Grid2';
import PageContainer from '@/shared/ui/PageContainer';

import WeeklyStats from '@/components/dashboards/modern/WeeklyStats';
import YearlySales from '@/components/dashboards/ecommerce/YearlySales';
import PaymentGateways from '@/components/dashboards/ecommerce/PaymentGateways';
import WelcomeCard from '@/components/dashboards/ecommerce/WelcomeCard';
import Expence from '@/components/dashboards/ecommerce/Expence';
import Growth from '@/components/dashboards/ecommerce/Growth';
import RevenueUpdates from '@/components/dashboards/ecommerce/RevenueUpdates';
import SalesOverview from '@/components/dashboards/ecommerce/SalesOverview';
import SalesTwo from '@/components/dashboards/ecommerce/SalesTwo';
import Sales from '@/components/dashboards/ecommerce/Sales';
import MonthlyEarnings from '@/components/dashboards/ecommerce/MonthlyEarnings';
import ProductPerformances from '@/components/dashboards/ecommerce/ProductPerformances';
import RecentTransactions from '@/components/dashboards/ecommerce/RecentTransactions';

const Ecommerce = () => {
  return (
    (<PageContainer title="eCommerce Dashboard" description="this is eCommerce Dashboard page">
      <Box mt={3}>
        <Grid2 container spacing={3}>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 8
            }}>
            <WelcomeCard />
          </Grid2>

          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <Grid2 container spacing={3}>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <Expence />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <Sales />
              </Grid2>
            </Grid2>
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <RevenueUpdates />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <SalesOverview />
          </Grid2>
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <Grid2 container spacing={3}>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <SalesTwo />
              </Grid2>
              <Grid2
                size={{
                  xs: 12,
                  sm: 6
                }}>
                <Growth />
              </Grid2>
              <Grid2 size={12}>
                <MonthlyEarnings />
              </Grid2>
            </Grid2>
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <WeeklyStats />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <YearlySales />
          </Grid2>
          {/* column */}
          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <PaymentGateways />
          </Grid2>
          {/* column */}

          <Grid2
            size={{
              xs: 12,
              lg: 4
            }}>
            <RecentTransactions />
          </Grid2>
          {/* column */}

          <Grid2
            size={{
              xs: 12,
              lg: 8
            }}>
            <ProductPerformances />
          </Grid2>
        </Grid2>
      </Box>
    </PageContainer>)
  );
};

export default Ecommerce;
