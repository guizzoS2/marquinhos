import { Outlet } from 'react-router-dom';
import { StreetFrame } from '../street/StreetFrame';

export function FreelaLayout() {
  return (
    <StreetFrame>
      <Outlet />
    </StreetFrame>
  );
}
