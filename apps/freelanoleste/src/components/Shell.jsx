import { Outlet, useLocation } from 'react-router-dom';
import { StreetFrame } from './street/StreetFrame';
import { StreetNav } from './street/StreetNav';

export function Shell() {
  const location = useLocation();
  const hideNav = location.pathname.startsWith('/login/');

  return (
    <StreetFrame>
      {hideNav ? null : <StreetNav />}
      <main>
        <Outlet />
      </main>
    </StreetFrame>
  );
}
