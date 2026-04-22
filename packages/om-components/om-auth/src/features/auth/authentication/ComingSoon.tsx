import React, { useEffect } from 'react';

interface ComingSoonProps {
  pageName?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ pageName = "This page" }) => {
  useEffect(() => {
    // Create floating particles
    const createParticles = () => {
      const particles = document.getElementById('particles');
      if (!particles) return;
      
      const particleCount = 50;
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        
        particles.appendChild(particle);
      }
    };

    // Countdown timer
    const updateCountdown = () => {
      const launchDate = new Date('2025-10-08T00:00:00').getTime();
      const now = new Date().getTime();
      const distance = launchDate - now;
      
      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const daysEl = document.getElementById('days');
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (daysEl) daysEl.textContent = days.toString().padStart(2, '0');
        if (hoursEl) hoursEl.textContent = hours.toString().padStart(2, '0');
        if (minutesEl) minutesEl.textContent = minutes.toString().padStart(2, '0');
        if (secondsEl) secondsEl.textContent = seconds.toString().padStart(2, '0');
      } else {
        const countdownEl = document.getElementById('countdown');
        if (countdownEl) {
          countdownEl.innerHTML = '<div class="countdown-item"><span class="countdown-number">🎉</span><span class="countdown-label">Launched!</span></div>';
        }
      }
    };

    // Initialize
    createParticles();
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
      const particles = document.getElementById('particles');
      if (particles) {
        particles.innerHTML = '';
      }
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap');
          
          .coming-soon-container {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 30%, #e9d5ff 70%, #ddd6fe 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Inter', sans-serif;
            color: #4a5568;
            overflow: auto;
            position: relative;
            padding: 2rem 1rem;
          }
          
          .particles {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 1;
          }
          
          .particle {
            position: absolute;
            background: rgba(139, 92, 246, 0.15);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
          }
          
          .main-content {
            text-align: center;
            z-index: 2;
            position: relative;
            max-width: 800px;
            padding: 2rem;
          }
          
          .coming-soon-title {
            font-family: 'Playfair Display', serif;
            font-size: clamp(2.5rem, 6vw, 4.5rem);
            font-weight: 700;
            margin-bottom: 1rem;
            color: #FFD700;
            background: linear-gradient(45deg, #FFD700, #FFA500, #FFD700);
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: goldShimmer 3s ease-in-out infinite;
            text-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
            line-height: 1.1;
          }
          
          @keyframes goldShimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          .subtitle {
            font-size: 1.2rem;
            margin-bottom: 3rem;
            opacity: 0.9;
            font-weight: 300;
            letter-spacing: 1px;
          }
          
          .logo-container {
            margin: 2rem 0;
            animation: fadeInUp 1s ease-out 0.5s both;
          }
          
          .countdown-container {
            margin: 3rem 0;
            animation: fadeInUp 1s ease-out 0.7s both;
          }
          
          .countdown {
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
          }
          
          .countdown-item {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(139, 92, 246, 0.2);
            border-radius: 15px;
            padding: 1.5rem 1rem;
            min-width: 120px;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          
          .countdown-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(139, 92, 246, 0.2);
          }
          
          .countdown-number {
            font-size: 3rem;
            font-weight: 700;
            color: #FFD700;
            display: block;
            line-height: 1;
          }
          
          .countdown-label {
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 0.5rem;
            opacity: 0.8;
          }
          
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .launch-text {
            margin-top: 2rem;
            font-size: 1rem;
            opacity: 0.8;
            animation: fadeInUp 1s ease-out 0.9s both;
          }
          
          .early-access-section {
            margin-top: 3rem;
            animation: fadeInUp 1s ease-out 1.1s both;
            text-align: center;
          }
          
          .early-access-text {
            font-size: 1.3rem;
            margin-bottom: 1.5rem;
            background: linear-gradient(45deg, #8B5CF6, #EC4899, #10B981, #F59E0B);
            background-size: 300% 300%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: colorShift 4s ease-in-out infinite;
            font-weight: 500;
          }
          
          @keyframes colorShift {
            0%, 100% { background-position: 0% 50%; }
            25% { background-position: 100% 50%; }
            50% { background-position: 200% 50%; }
            75% { background-position: 300% 50%; }
          }
          
          .login-button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(45deg, #6B46C1, #8B5CF6);
            color: white;
            text-decoration: none;
            border-radius: 25px;
            font-weight: 600;
            font-size: 1.1rem;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(107, 70, 193, 0.3);
            border: 2px solid transparent;
          }
          
          .login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(107, 70, 193, 0.4);
            background: linear-gradient(45deg, #553C9A, #6B46C1);
          }
          
          .login-button:active {
            transform: translateY(0px);
          }
          
          @media (max-width: 768px) {
            .countdown {
              gap: 1rem;
            }
            
            .countdown-item {
              min-width: 80px;
              padding: 1rem 0.5rem;
            }
            
            .countdown-number {
              font-size: 2rem;
            }
          }
        `
      }} />
      
      <div className="coming-soon-container">
        <div className="particles" id="particles"></div>
        
        <div className="main-content">
          <h1 className="coming-soon-title">Coming Soon</h1>
          <p className="subtitle">Something amazing is on the way</p>
          
          <div className="logo-container">
            <svg width="600" height="150" viewBox="0 0 600 150" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(45, 22)">
                <rect x="37" y="12" width="9" height="75" fill="#FFD700"/>
                <rect x="25" y="18" width="33" height="6" fill="#FFD700"/>
                <rect x="16" y="37" width="51" height="7" fill="#FFD700"/>
                <rect x="21" y="63" width="42" height="6" fill="#FFD700" transform="rotate(-15 42 66)"/>
              </g>
              
              <text x="135" y="52" fontFamily="serif" fontSize="36" fontWeight="600" fill="#6B46C1">Orthodox</text>
              <text x="135" y="90" fontFamily="serif" fontSize="36" fontWeight="600" fill="#6B46C1">Metrics</text>
              <text x="135" y="117" fontFamily="serif" fontSize="12" fontWeight="400" fill="#6B46C1">© 2025</text>
            </svg>
          </div>
          
          <div className="early-access-section">
            <p className="early-access-text">Early Access user?</p>
            <a href="https://orthodoxmetrics.com" className="login-button">Login here</a>
          </div>
          
          <div className="countdown-container">
            <div className="countdown" id="countdown">
              <div className="countdown-item">
                <span className="countdown-number" id="days">0</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number" id="hours">0</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number" id="minutes">0</span>
                <span className="countdown-label">Minutes</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number" id="seconds">0</span>
                <span className="countdown-label">Seconds</span>
              </div>
            </div>
          </div>
          
          <p className="launch-text">Official Launch • October 8, 2025</p>
        </div>
      </div>
    </>
  );
};

export default ComingSoon;
