'use client';

import Chrome from '@/components/Chrome';
import Rail from '@/components/Rail';
import Hero from '@/components/Hero';
import ActivitySection from '@/components/ActivitySection';
import ExperienceSection from '@/components/ExperienceSection';
import ProjectsSection from '@/components/ProjectsSection';
import SkillsSection from '@/components/SkillsSection';
import ContactSection from '@/components/ContactSection';
import EasterEgg from '@/components/EasterEgg';

export default function Home() {
  return (
    <>
      <Chrome />

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
          <ProjectsSection />
          <ExperienceSection />
          <SkillsSection />
          <ContactSection />
        </main>
      </div>

      <EasterEgg />
    </>
  );
}
