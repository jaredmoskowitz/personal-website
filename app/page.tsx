'use client';

import { useState, useEffect } from 'react';
import Chrome from '@/components/Chrome';
import Rail from '@/components/Rail';
import Hero from '@/components/Hero';
import ActivitySection from '@/components/ActivitySection';
import ExperienceSection from '@/components/ExperienceSection';
import ProjectsSection from '@/components/ProjectsSection';
import SkillsSection from '@/components/SkillsSection';
import ContactSection from '@/components/ContactSection';
import CommandPalette from '@/components/CommandPalette';
import EasterEgg from '@/components/EasterEgg';

export default function Home() {
  const [palOpen, setPalOpen] = useState(false);

  // ⌘K global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setPalOpen(o => !o);
      }
      if (e.key === 'Escape') setPalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <Chrome onOpenPalette={() => setPalOpen(true)} />

      <div style={{ display: 'flex' }}>
        <Rail />

        <main style={{
          flex: 1, minWidth: 0,
          padding: '56px 56px 100px',
          maxWidth: 1100,
        }} className="tm-main">
          <style>{`@media (max-width: 760px) { .tm-main { padding: 32px 18px 80px !important; } }`}</style>

          <Hero />
          <ActivitySection />
          <ExperienceSection />
          <ProjectsSection />
          <SkillsSection />
          <ContactSection />
        </main>
      </div>

      <CommandPalette open={palOpen} onClose={() => setPalOpen(false)} />
      <EasterEgg paletteOpen={palOpen} />
    </>
  );
}
