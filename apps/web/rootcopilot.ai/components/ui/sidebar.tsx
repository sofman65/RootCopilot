"use client";
import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  // Close the mobile drawer on route change so it doesn't overlay the new page
  const pathname = usePathname();
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate: animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};


export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...(props as React.ComponentProps<"div">)} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  // Explicitly disable the desktop rail on mobile to avoid it occupying space
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    handleChange(mq);
    mq.addEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
    return () => mq.removeEventListener("change", handleChange as (e: MediaQueryListEvent) => void);
  }, []);

  if (isMobile) {
    return null;
  }
  return (
    <>
      <motion.div
        className={cn(
          // Full-height, fixed background that never changes height - ChatGPT style
          "hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-[300px] shrink-0",
          // Light mode - clean white background like ChatGPT
          "border-r border-neutral-200 bg-white",
          // Dark mode - dark background like ChatGPT
          "dark:border-neutral-700 dark:bg-neutral-900",
          className,
        )}
        animate={{
          width: animate ? (open ? "300px" : "100px") : "300px",
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        <div className="flex flex-col h-full p-0">
          {children as React.ReactNode}
        </div>
      </motion.div>
    </>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      <div
        className={cn(
          // Mobile top bar uses translucent surface + blur in light and dark
          "fixed top-0 left-0 right-0 z-40 h-12 px-4 flex flex-row md:hidden items-center justify-between w-full",
          "bg-white/80 dark:bg-neutral-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-neutral-900/60",
        )}
        {...props}
      >
        <div className="flex justify-end z-20 w-full">
          <IconMenu2
            className="text-neutral-800 dark:text-neutral-200"
            onClick={() => setOpen(!open)}
          />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ x: "-100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "-100%", opacity: 0 }}
            transition={{
              duration: 0.3,
              ease: "easeInOut",
            }}
            className={cn(
              // Drawer surface follows theme gradient for consistency
              "fixed h-full w-full inset-0 p-10 z-[100] flex flex-col justify-between md:hidden",
              "bg-gradient-to-b from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-800",
              className
            )}
          >
            <div
              className="absolute right-10 top-10 z-50 text-neutral-800 dark:text-neutral-200"
              onClick={() => setOpen(!open)}
            >
              <IconX />
            </div>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: () => void;
}) => {
  const { open, animate } = useSidebar();
  
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link
      href={link.href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 group/sidebar py-2.5 rounded-lg transition-colors",
        open ? "px-3 justify-start" : "px-0 justify-center",
        "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        "text-neutral-700 dark:text-neutral-200",
        "text-sm font-medium",
        className
      )}
      {...props}
    >
      {link.icon}

      <motion.span
        animate={{
          opacity: animate ? (open ? 1 : 0) : 1,
          width: animate ? (open ? "auto" : 0) : "auto",
        }}
        className={cn(
          "text-sm whitespace-pre inline-block !p-0 !m-0 transition-all duration-150",
          "group-hover/sidebar:translate-x-1",
          !open && "overflow-hidden"
        )}
      >
        {link.label}
      </motion.span>
    </Link>
  );
};
