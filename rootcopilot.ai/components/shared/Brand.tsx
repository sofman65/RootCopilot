"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type BrandProps = {
  size?: number;
  withText?: boolean;
  className?: string;
  textClassName?: string;
  href?: string;
};

function BrandContent({
  size = 32,
  withText = false,
  className,
  textClassName,
}: Omit<BrandProps, "href">) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/logo.png"
        alt="RootCopilot logo"
        width={size}
        height={size}
        priority
        className="rounded-lg shadow-lg shadow-blue-500/10"
      />
      {withText && (
        <span className={cn("font-semibold tracking-tight", textClassName)}>
          RootCopilot
        </span>
      )}
    </div>
  );
}

export default function Brand({
  href,
  ...rest
}: BrandProps) {
  if (href) {
    return (
      <Link href={href} className="inline-flex items-center gap-2">
        <BrandContent {...rest} />
      </Link>
    );
  }

  return <BrandContent {...rest} />;
}
