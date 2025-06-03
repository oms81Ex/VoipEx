import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Header from './Header';

const Layout = () => {
  return (
    <>
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          bgcolor: 'background.default',
          minHeight: 0
        }}
      >
        <Outlet />
      </Box>
    </>
  );
};

export default Layout; 