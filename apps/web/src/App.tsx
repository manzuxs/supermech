import CenterCanvas from './components/layout/CenterCanvas.tsx';
import FloatingFeedback from './components/layout/FloatingFeedback.tsx';
import LogoBar from './components/layout/LogoBar.tsx';
import SettingsPopover from './components/layout/SettingsPopover.tsx';
import { useWorkbench } from './context/WorkbenchContext.tsx';

export default function App() {
  const { state } = useWorkbench();
  const isBrainstorming = state.meta.activeSkill === 'brainstorming';
  const isWritingPlans = state.meta.activeSkill === 'writing-plans';
  const isExecutingPlans = state.meta.activeSkill === 'executing-plans';
  const showInspector =
    (isBrainstorming || isWritingPlans || isExecutingPlans) &&
    state.ui.rightSidebarOpen &&
    state.ui.selectedNodeId !== null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg-main)]">
      <div
        className={`h-full w-full ${
          showInspector ? 'grid grid-cols-[minmax(0,1fr)_22rem]' : ''
        }`}
      >
        <CenterCanvas />
        {(isBrainstorming || isWritingPlans || isExecutingPlans) && <FloatingFeedback />}
      </div>
      <LogoBar />
      <SettingsPopover />
    </div>
  );
}
