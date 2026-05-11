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
  href = "/photo/gallery",
  label = "Back to Photos",
}: BackToPhotosButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(href);
  };

  return (
    <Button type="button" variant="outline" size="default" className={className} onClick={handleBack}>
      {label}
    </Button>
  );
}