import React, { forwardRef } from "react";
import { cn } from "../../lib/utils";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

const RetroGrid = ({
  angle = 65,
  cellSize = 60,
  opacity = 0.5,
  lightLineColor = "#E2E8F0",
  darkLineColor = "#E2E8F0",
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
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent to-90%" />
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
        light: "", // Not used in current layout, but kept for compatibility
        dark: "",
      },
      gridOptions,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("relative pt-24 pb-32 overflow-hidden bg-[#f8fafc]", className)} ref={ref} {...props}>
        <div 
          className="absolute inset-0 z-[0] opacity-70"
          style={{
            backgroundImage: `
              radial-gradient(circle at 0% 0%, #dbeafe 0%, transparent 50%),
              radial-gradient(circle at 100% 0%, #fef3c7 0%, transparent 50%),
              radial-gradient(circle at 100% 100%, #e9d5ff 0%, transparent 50%),
              radial-gradient(circle at 0% 100%, #e0e7ff 0%, transparent 50%)
            `
          }} 
        />
        
        <section className="relative max-w-full mx-auto z-10">
          <RetroGrid {...gridOptions} />
          
          <div className="max-w-screen-xl z-20 relative mx-auto px-4 py-20 gap-12 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="space-y-6 max-w-xl text-center lg:text-left mx-auto lg:mx-0">
                <div className="w-fit mx-auto lg:mx-0">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur shadow-sm text-sm font-semibold text-accent-primary border border-accent-primary/20 cursor-default">
                    {title}
                  </span>
                </div>

                <h2 className="text-4xl lg:text-5xl xl:text-6xl tracking-tighter font-extrabold text-slate-900 leading-[1.1]">
                  <span className="block">{subtitle.regular}</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-accent-primary via-purple-500 to-blue-500 pb-2">
                    {subtitle.gradient}
                  </span>
                </h2>
                
                <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-medium mt-6">
                  {description}
                </p>
                
                <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 mt-10">
                  <span className="relative inline-block overflow-hidden rounded-full p-[1.5px] hover:scale-105 transition-transform">
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#EBE8FE_0%,#5D5FEF_50%,#EBE8FE_100%)]" />
                    <div className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-white text-base font-medium backdrop-blur-3xl">
                      <Link
                        to={ctaHref}
                        className="inline-flex rounded-full text-center group items-center w-full justify-center text-slate-900 hover:bg-slate-50 transition-all sm:w-auto py-4 px-10"
                      >
                        {ctaText} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform ml-1" />
                      </Link>
                    </div>
                  </span>
                  
                  <Link to="/login">
                     <button className="px-8 py-4 rounded-full text-base font-medium bg-white/50 backdrop-blur-md border border-slate-200 hover:bg-white text-slate-700 hover:text-accent-primary transition-all shadow-sm">
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

