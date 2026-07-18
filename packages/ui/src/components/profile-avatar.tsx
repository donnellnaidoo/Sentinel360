"use client";

import { cn } from "@Sentinel360/ui/lib/utils";
import { Camera, User } from "lucide-react";
import { useRef, useState } from "react";

type AvatarSize = "sm" | "md" | "lg" | "xl";
type StatusDot = "online" | "offline" | "away";

const sizeMap: Record<AvatarSize, string> = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-20 w-20",
  xl: "h-30 w-30",
};

const statusDotMap: Record<StatusDot, string> = {
  online: "bg-green-500",
  offline: "bg-gray-500",
  away: "bg-yellow-500",
};

interface ProfileAvatarProps {
  src?: string;
  alt: string;
  size?: AvatarSize;
  editable?: boolean;
  onUpload?: (file: File) => void;
  status?: StatusDot;
  fallback?: string;
  className?: string;
}

function ProfileAvatar({
  src,
  alt,
  size = "md",
  editable,
  onUpload,
  status,
  className,
}: ProfileAvatarProps) {
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sizeClass = sizeMap[size];

  return (
    <div
      data-slot="profile-avatar"
      className={cn("relative inline-flex shrink-0", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-full border-2 border-white/10",
          sizeClass,
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
            <User className="h-1/2 w-1/2" />
          </div>
        )}

        {editable && hovering && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/50 transition-colors"
            aria-label="Upload photo"
          >
            <Camera className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            statusDotMap[status],
          )}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUpload) onUpload(file);
        }}
      />
    </div>
  );
}

export { ProfileAvatar };
