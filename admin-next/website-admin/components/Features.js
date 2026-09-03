'use client';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer, hoverScale } from '../utils/animations';

const features = [
  {
    title: 'Goal management',
    desc: 'Take all the steps promised to reach goals, gather input and drive innovation.',
    icon: '🎯'
  },
  {
    title: 'Real-time updates',
    desc: 'Drive focus and progress with real-time status updates.',
    icon: '⚡'
  },
  {
    title: 'High-level customization',
    desc: 'Choose from pre-built pipeline templates, or create custom interview steps.',
    icon: '🛠️'
  }
];

export default function Features() {
  return (
    <section className="section-container" style={{ textAlign: 'center' }}>
      <motion.div {...fadeUp} style={{ marginBottom: '8rem' }}>
        <span className="badge">Everything in one place</span>
        <h2 style={{ fontSize: '5rem', fontWeight: '900', letterSpacing: '-4px', lineHeight: '0.9', marginBottom: '2.5rem' }}>
          Everything you <br /> need to <span style={{ color: 'var(--text-muted)' }}>succeed.</span>
        </h2>
        <motion.button {...hoverScale} className="btn-primary" style={{ marginTop: '1rem' }}>Explore Platform</motion.button>
      </motion.div>

      <motion.div 
        variants={staggerContainer}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '3rem' 
        }}
      >
        {features.map((f, i) => (
          <motion.div
            key={i}
            variants={fadeUp}
            whileHover={{ y: -15, scale: 1.02 }}
            className="glass-card"
            style={{ textAlign: 'left', padding: '4rem 3rem', background: '#fff', borderRadius: '40px', border: '1px solid var(--border)' }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '2rem', display: 'inline-block', padding: '1rem', background: 'var(--surface)', borderRadius: '24px' }}>{f.icon}</div>
            <h3 style={{ fontSize: '1.8rem', fontWeight: '900', marginBottom: '1.5rem' }}>{f.title}</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', marginBottom: '2.5rem', fontSize: '1.1rem' }}>{f.desc}</p>
            <motion.button 
              whileHover={{ x: 10 }}
              style={{ fontWeight: '800', fontSize: '0.9rem', color: '#000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              Explore feature details <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>→</span>
            </motion.button>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
