import CenterCanvas from './components/layout/CenterCanvas.tsx';
import FloatingFeedback from './components/layout/FloatingFeedback.tsx';
import Footer from './components/layout/Footer.tsx';
import Header from './components/layout/Header.tsx';
import LeftSidebar from './components/layout/LeftSidebar.tsx';

export default function App() {
  return (
    <div className="grid h-screen w-screen grid-cols-[auto_1fr] grid-rows-[64px_1fr_32px] overflow-hidden bg-[var(--bg-main)]">
      <Header />
      <LeftSidebar />
      <div className="relative h-full flex-1 overflow-hidden">
        <CenterCanvas />
        <FloatingFeedback />
      </div>
      <Footer />
    </div>
  );
}
