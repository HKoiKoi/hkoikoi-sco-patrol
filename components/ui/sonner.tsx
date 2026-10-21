"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      toastOptions={{
        classNames: {
          // 흰 배경과 구분되도록 그림자를 키운다(Sonner 기본 그림자보다 우선)
          toast: "shadow-lg!",
          title: "font-medium",
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          // 테마 토큰이 oklch 값 전체라 hsl()로 감싸지 않는다(감싸면 색이 무효가 되어 배경이 비어 보인다)
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border":
            "color-mix(in oklch, var(--foreground) 22%, transparent)",
          // 성공: 브랜드(primary) 색조
          "--success-bg":
            "color-mix(in oklch, var(--primary) 14%, var(--popover))",
          "--success-text":
            "color-mix(in oklch, var(--primary) 60%, var(--foreground))",
          "--success-border":
            "color-mix(in oklch, var(--primary) 55%, transparent)",
          // 오류: destructive 색조
          "--error-bg":
            "color-mix(in oklch, var(--destructive) 12%, var(--popover))",
          "--error-text": "var(--destructive)",
          "--error-border":
            "color-mix(in oklch, var(--destructive) 55%, transparent)",
          // 안내: secondary(따뜻한 톤)
          "--info-bg": "var(--secondary)",
          "--info-text": "var(--secondary-foreground)",
          "--info-border":
            "color-mix(in oklch, var(--secondary-foreground) 35%, transparent)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
