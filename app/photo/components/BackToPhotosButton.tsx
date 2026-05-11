"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type BackToPhotosButtonProps = {
  className?: string;
  href?: string;
  label?: string;
};

export default function BackToPhotosButton({
  className,
  href = "/photo",
  label = "Photo Home",
}: BackToPhotosButtonProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push(href);
  };

  return (
    <Button type="button" variant="outline" size="default" className={className} onClick={handleGoHome}>
      {label}
    </Button>
  );
}