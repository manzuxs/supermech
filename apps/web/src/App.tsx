import CenterCanvas from './components/layout/CenterCanvas.tsx';
import Footer from './components/layout/Footer.tsx';
import Header from './components/layout/Header.tsx';
import LeftSidebar from './components/layout/LeftSidebar.tsx';
import RightSidebar from './components/layout/RightSidebar.tsx';

export default function App() {
  return (
    <div className="grid h-screen w-screen grid-cols-[auto_1fr_auto] grid-rows-[64px_1fr_32px] overflow-hidden bg-[var(--bg-main)]">
      <Header />
      <LeftSidebar />
      <CenterCanvas />
      <RightSidebar />
      <Footer />
    </div>
  );
}
