import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Zap, Clock, CalendarDays, Wallet, Building, ArrowRight, CheckCircle2, BarChart3, Fingerprint, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Footerdemo } from '../components/ui/footer-section';
import { HeroSection } from '../components/ui/retro-grid-hero';
import { motion, AnimatePresence } from 'framer-motion';

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15
    }
  }
};

const Landing = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const slides = [
    { title: "Real-Time Tracking", desc: "Monitor employee check-ins instantly.", icon: Clock, color: "text-blue-500", bg: "bg-blue-100" },
    { title: "Automated Payroll", desc: "One-click accurate salary generation.", icon: Wallet, color: "text-purple-500", bg: "bg-purple-100" },
    { title: "Leave Management", desc: "Approve time-off requests effortlessly.", icon: CalendarDays, color: "text-rose-500", bg: "bg-rose-100" }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans">
      
      {/* Navbar */}
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed w-full top-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "border-b border-slate-200/50 bg-white/70 backdrop-blur-xl shadow-sm" 
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="w-full px-6 md:px-12 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/Crew.png" alt="Crew HRMS Logo" className="h-16 w-auto object-contain drop-shadow-sm scale-110 origin-left" />
          </div>
          <div className="hidden md:flex gap-4 items-center">
            <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-accent-primary border border-slate-200 hover:border-accent-primary/50 bg-white/50 hover:bg-white px-5 py-2.5 rounded-full transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0">
              Sign In
            </Link>
            <Link to="/signup">
              <Button variant="primary" className="text-sm px-6 py-2.5 rounded-full shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
          <button 
            className="md:hidden p-2 text-slate-700 hover:text-accent-primary transition-colors focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-lg overflow-hidden"
            >
              <div className="px-6 py-6 flex flex-col gap-4">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="w-full text-center text-base font-semibold text-slate-700 hover:text-accent-primary border border-slate-200 hover:border-accent-primary/50 bg-slate-50 hover:bg-white py-3 rounded-xl transition-all duration-300">
                  Sign In
                </Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="w-full">
                  <Button variant="primary" className="w-full text-base py-3 rounded-xl shadow-lg shadow-accent-primary/20 hover:shadow-accent-primary/40 transition-all">
                    Get Started
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <main className="flex-grow">
        
        {/* HERO SECTION */}
        <HeroSection>
          {/* Right Side Animation Slider */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative block h-[350px] sm:h-[400px] lg:h-[450px] w-full mt-12 lg:mt-0"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-accent-primary/5 to-purple-500/5 rounded-[2.5rem] border border-white shadow-2xl backdrop-blur flex items-center justify-center overflow-hidden">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={currentSlide}
                   initial={{ opacity: 0, x: 100, scale: 0.95 }}
                   animate={{ opacity: 1, x: 0, scale: 1 }}
                   exit={{ opacity: 0, x: -100, scale: 0.95 }}
                   transition={{ duration: 0.5, ease: "easeInOut" }}
                   className="text-center p-6 sm:p-10 bg-white/80 backdrop-blur-md rounded-3xl shadow-xl border border-white max-w-[90%] sm:max-w-md lg:max-w-lg w-full mx-auto"
                 >
                    {(() => {
                       const SlideIcon = slides[currentSlide].icon;
                       return (
                         <>
                           <div className={`w-16 h-16 sm:w-24 sm:h-24 ${slides[currentSlide].bg} ${slides[currentSlide].color} rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-8 shadow-sm`}>
                             <SlideIcon className="w-8 h-8 sm:w-12 sm:h-12" strokeWidth={2.5} />
                           </div>
                           <h3 className="text-xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-4">{slides[currentSlide].title}</h3>
                           <p className="text-sm sm:text-xl text-slate-500 leading-relaxed">{slides[currentSlide].desc}</p>
                         </>
                       );
                    })()}
                 </motion.div>
               </AnimatePresence>
               
               {/* Slider Dots */}
               <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3">
                 {slides.map((_, i) => (
                   <div key={i} className={`h-2.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-10 bg-accent-primary' : 'w-2.5 bg-slate-300'}`} />
                 ))}
               </div>
            </div>
          </motion.div>
        </HeroSection>

        {/* LOGOS / SOCIAL PROOF (Mock) */}
        <section className="border-y border-slate-200/50 bg-white/50 backdrop-blur-sm py-10 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Trusted by modern teams worldwide</p>
            <div className="flex justify-center gap-12 sm:gap-20 opacity-40 grayscale flex-wrap">
              {['Acme Corp', 'Globex', 'Soylent', 'Initech', 'Umbrella'].map((logo, i) => (
                <div key={i} className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <Fingerprint size={24} /> {logo}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeIn}
              className="text-center mb-20"
            >
              <h2 className="text-3xl sm:text-5xl font-bold text-slate-900 tracking-tight mb-4">Everything you need, <br />nothing you don't.</h2>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">Built for growing companies that demand a reliable, beautiful, and blazing-fast HR solution.</p>
            </motion.div>
            
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[
                { icon: ShieldCheck, title: 'Secure RBAC', desc: 'Role-based access control with JWT authentication. Employees see only their data; Admins manage everything.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { icon: Clock, title: 'Real-Time Attendance', desc: 'Check In / Check Out system with live status indicators. Track working hours and break times automatically.', color: 'text-blue-500', bg: 'bg-blue-50' },
                { icon: Wallet, title: 'Automated Payroll', desc: 'Auto-compute Basic, HRA, PF, LTA, Professional Tax and Fixed Allowance from a single wage input.', color: 'text-purple-500', bg: 'bg-purple-50' },
                { icon: Users, title: 'Employee Directory', desc: 'Visual employee cards with status indicators. Click any card to view full profile in read-only mode.', color: 'text-amber-500', bg: 'bg-amber-50' },
                { icon: CalendarDays, title: 'Leave Management', desc: 'Paid, Sick, and Unpaid leave types. Employees request, Admins approve/reject with one click.', color: 'text-rose-500', bg: 'bg-rose-50' },
                { icon: BarChart3, title: 'Dynamic Dashboards', desc: 'Beautiful, interactive charts and heatmaps that give you an instant overview of your workforce.', color: 'text-indigo-500', bg: 'bg-indigo-50' },
              ].map(({ icon: Icon, title, desc, color, bg }, i) => (
                <motion.div key={i} variants={fadeIn}>
                  <Card className="h-full p-8 border border-slate-100 bg-white/50 backdrop-blur-sm hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-300 group cursor-default">
                    <div className={`w-14 h-14 ${bg} ${color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                      <Icon size={28} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-accent-primary transition-colors">{title}</h3>
                    <p className="text-slate-600 leading-relaxed">{desc}</p>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* HOW IT WORKS / STATS */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
           <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-accent-primary via-slate-900 to-slate-900 pointer-events-none"></div>
           
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                
                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                >
                  <h2 className="text-3xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
                    Onboard in minutes.<br/> Scale for years.
                  </h2>
                  <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                    Say goodbye to messy spreadsheets and disconnected tools. Crew brings everything under one roof with a workflow designed for speed.
                  </p>
                  <ul className="space-y-4">
                    {[
                      'Add employees and assign roles instantly',
                      'Employees self-serve their check-ins and time off',
                      'Generate accurate payroll with a single click'
                    ].map((item, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-300 font-medium">
                        <CheckCircle2 size={20} className="text-accent-primary" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  {/* Mock Dashboard Graphic */}
                  <div className="bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-2 relative z-10 transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-primary/20 to-purple-500/20 blur-xl -z-10 rounded-3xl"></div>
                    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700">
                      <div className="h-8 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
                         <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                         <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                         <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      </div>
                      <div className="p-6">
                        <div className="h-4 bg-slate-800 rounded w-1/3 mb-6"></div>
                        <div className="flex gap-4 mb-6">
                           <div className="h-24 bg-slate-800 rounded flex-1"></div>
                           <div className="h-24 bg-slate-800 rounded flex-1"></div>
                           <div className="h-24 bg-slate-800 rounded flex-1"></div>
                        </div>
                        <div className="h-40 bg-slate-800 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>
           </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 bg-white relative overflow-hidden">
           <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
           >
              <div className="bg-mesh-pattern rounded-[3rem] p-12 sm:p-20 shadow-2xl shadow-indigo-500/10 border border-white">
                <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-6">
                  Ready to upgrade your HR?
                </h2>
                <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                  Join hundreds of forward-thinking companies that use Crew to manage their workforce effortlessly.
                </p>
                <Link to="/signup">
                  <Button variant="primary" className="px-10 py-5 rounded-full text-lg shadow-xl shadow-accent-primary/30 hover:scale-105 transition-transform">
                    Get Started for Free
                  </Button>
                </Link>
                <p className="text-sm text-slate-500 mt-6 font-medium">No credit card required. 14-day free trial.</p>
              </div>
           </motion.div>
        </section>

      </main>
      
      <Footerdemo />
    </div>
  );
};

export default Landing;

