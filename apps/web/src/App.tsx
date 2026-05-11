import CenterCanvas from './components/layout/CenterCanvas.tsx';
import Footer from './components/layout/Footer.tsx';
import Header from './components/layout/Header.tsx';
import LeftSidebar from './components/layout/LeftSidebar.tsx';
import RightSidebar from './components/layout/RightSidebar.tsx';

export default function App() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'var(--sidebar-width) 1fr var(--sidebar-width)',
        gridTemplateRows: 'auto 1fr auto',
        gridTemplateAreas: `
          "header header header"
          "left   canvas right"
          "footer footer footer"
        `,
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <Header />
      <LeftSidebar />
      <CenterCanvas />
      <RightSidebar />
      <Footer />
    </div>
  );
}
