import CenterCanvas from './components/layout/CenterCanvas.tsx';
import FloatingFeedback from './components/layout/FloatingFeedback.tsx';
import Footer from './components/layout/Footer.tsx';
import Header from './components/layout/Header.tsx';
import LeftSidebar from './components/layout/LeftSidebar.tsx';
import { useWorkbench } from './context/WorkbenchContext.tsx';

export default function App() {
  const { state } = useWorkbench();
  const isBrainstorming = state.meta.activeSkill === 'brainstorming';
  const isWritingPlans = state.meta.activeSkill === 'writing-plans';
  const showInspector =
    (isBrainstorming || isWritingPlans) &&
    state.ui.rightSidebarOpen &&
    state.ui.selectedNodeId !== null;

  return (
    <div className="grid h-screen w-screen grid-cols-[auto_1fr] grid-rows-[64px_1fr_32px] overflow-hidden bg-[var(--bg-main)]">
      <Header />
      <LeftSidebar />
      <div
        className={`relative h-full min-w-0 overflow-hidden ${
          showInspector ? 'grid grid-cols-[minmax(0,1fr)_22rem]' : ''
        }`}
      >
        <CenterCanvas />
        {(isBrainstorming || isWritingPlans) && <FloatingFeedback />}
      </div>
      <Footer />
    </div>
  );
}
