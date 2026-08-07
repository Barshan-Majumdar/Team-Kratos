import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "#EAE7E0",
  darkLineColor = "#EAE7E0",
}) => {
  const gridStyles = {
    "--grid-angle": `${angle}deg`,
    "--cell-size": `${cellSize}px`,
    "--opacity": opacity,
    "--light-line": lightLineColor,
    "--dark-line": darkLineColor,
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        `opacity-[var(--opacity)]`
      )}
      style={gridStyles}
    >
      <div className="absolute inset-0 [transform:rotateX(var(--grid-angle))]">
        <div className="animate-grid [background-image:linear-gradient(to_right,var(--light-line)_1px,transparent_0),linear-gradient(to_bottom,var(--light-line)_1px,transparent_0)] [background-repeat:repeat] [background-size:var(--cell-size)_var(--cell-size)] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw]" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] to-transparent to-90%" />
    </div>
  );
};

const HeroSection = forwardRef(
  (
    {
      className,
      title = "The Future of HR Management",
      subtitle = {
        regular: "Manage your crew ",
        gradient: "without the chaos.",
      },
      description = "Streamline your workforce management with automated payroll computation, real-time attendance tracking, and beautiful employee profiles — all in one unified platform.",
      ctaText = "Start Free Trial",
      ctaHref = "/signup",
      bottomImage = {
        light: "",
        dark: "",
      },
      gridOptions,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative pt-28 pb-36 overflow-hidden bg-[#FAF9F6]", className)} ref={ref} {...props}>
        {/* Warm stone ambient glow */}
        <div 
          className="absolute inset-0 z-[0] opacity-60 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at 0% 0%, rgba(234,231,224,0.9) 0%, transparent 50%),
              radial-gradient(circle at 100% 0%, rgba(240,243,249,0.8) 0%, transparent 50%),
              radial-gradient(circle at 50% 100%, rgba(236,253,245,0.4) 0%, transparent 50%)
            `
          }} 
        />
        {/* Subtle film-grain texture overlay */}
        <div className="absolute inset-0 z-[1] pointer-events-none opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
        }} />
        
        <section className="relative max-w-full mx-auto z-10">
          <RetroGrid {...gridOptions} />
          
          <div className="max-w-screen-xl z-20 relative mx-auto px-4 py-24 gap-16 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              <div className="space-y-8 max-w-xl text-center lg:text-left mx-auto lg:mx-0">
                {/* Eyebrow Tag */}
                <div className="w-fit mx-auto lg:mx-0">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur shadow-xs text-[11px] font-display font-bold uppercase tracking-[0.15em] text-[#1F2B4D] border border-[#EAE7E0] cursor-default">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {title}
                  </span>
                </div>

                <h2 className="text-4xl lg:text-5xl xl:text-6xl tracking-tight font-serif font-bold text-[#1D1B16] leading-[1.08]">
                  <span className="block">{subtitle.regular}</span>
                  <span className="block text-[#1F2B4D] italic">
                    {subtitle.gradient}
                  </span>
                </h2>
                
                <p className="text-lg sm:text-xl text-[#6B655C] leading-relaxed font-medium mt-6">
                  {description}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mt-12">
                  {/* Primary CTA - Doppelrand button architecture */}
                  <div className="rounded-full p-[2px] bg-[#1F2B4D] shadow-[0_8px_24px_rgba(31,43,77,0.15)] hover:shadow-[0_12px_32px_rgba(31,43,77,0.25)] transition-all duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-[1.03] active:scale-[0.97]">
                    <Link
                      to={ctaHref}
                      className="inline-flex rounded-full text-center group items-center w-full justify-center text-white font-display font-bold sm:w-auto py-4 px-10 text-base gap-2"
                    >
                      {ctaText}
                      <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-1 group-hover:-translate-y-[1px] group-hover:scale-105 transition-transform duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)]">
                        <ChevronRight size={16} strokeWidth={2.5} />
                      </span>
                    </Link>
                  </div>
                  
                  <Link to="/login">
                    <button className="px-8 py-4 rounded-full text-base font-display font-bold bg-white border border-[#EAE7E0] hover:border-[#CBD5E1] text-[#1F2B4D] transition-all duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)] shadow-xs hover:shadow-[0_6px_24px_-4px_rgba(29,27,22,0.08)]">
                      See how it works
                    </button>
                  </Link>
                </div>
              </div>

              {props.children && (
                <div className="w-full relative z-20">
                  {props.children}
                </div>
              )}
            </div>
            
          </div>
        </section>
      </div>
    );
  }
);

HeroSection.displayName = "HeroSection";

export { HeroSection, RetroGrid };
