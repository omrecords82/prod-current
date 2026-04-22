import { Outlet } from "react-router-dom";
import LoadingBar from '../../LoadingBar';

const BlankLayout = () => (
  <>
    <LoadingBar />
    <Outlet />
  </>
);

export default BlankLayout;
