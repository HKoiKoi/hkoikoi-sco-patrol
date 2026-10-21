"use client";

import { useState } from "react";

import {
  SEAT_CATEGORY_COLORS,
  SEAT_CATEGORY_ICONS,
  SEAT_CATEGORY_LABELS,
  SEAT_CATEGORY_ORDER,
  SEAT_CHIP_SIZE_CLASS,
} from "@/components/patrol/seat-chips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addSeat, parseSeatInput } from "@/lib/seat-numbers";
import type { SeatCategory, SeatSet } from "@/lib/types/patrol";
import { cn } from "@/lib/utils";

/** 좌석 번호 입력 자릿수 상한 (안전한 정수 범위를 넘지 않도록 제한). */
const MAX_DIGITS = 6;

interface SeatCategoryInputProps {
  seats: SeatSet;
  onAddSeat: (category: SeatCategory, seat: number) => void;
  onRemoveSeat: (category: SeatCategory, seat: number) => void;
  className?: string;
}

interface SeatSectionProps {
  category: SeatCategory;
  seats: number[];
  onAddSeat: (seat: number) => void;
  onRemoveSeat: (seat: number) => void;
}

// 카테고리 하나의 칩 목록(탭하면 삭제)과 숫자 입력란
function SeatSection({
  category,
  seats,
  onAddSeat,
  onRemoveSeat,
}: SeatSectionProps) {
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");

  const Icon = SEAT_CATEGORY_ICONS[category];
  const label = SEAT_CATEGORY_LABELS[category];
  const parsed = parseSeatInput(input);
  const messageId = `seat-message-${category}`;

  const handleChange = (value: string) => {
    // 숫자 이외 문자는 입력되지 않게 걸러 낸다.
    setInput(value.replace(/\D/g, "").slice(0, MAX_DIGITS));
    setMessage("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (parsed === null) {
      setMessage("1 이상의 번호를 입력하세요");
      return;
    }
    if (!addSeat(seats, parsed).ok) {
      setMessage("이미 입력된 번호입니다");
      return;
    }
    onAddSeat(parsed);
    setInput("");
    setMessage("");
  };

  return (
    <section
      aria-label={label}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-md border p-3",
        SEAT_CATEGORY_COLORS[category],
      )}
    >
      <h2 className="flex items-center gap-1.5 text-xl font-semibold">
        <Icon className="size-6 shrink-0" aria-hidden="true" />
        <span className="break-words">{label}</span>
        <span className="ml-auto text-base tabular-nums">
          <span className="sr-only">, </span>
          {seats.length}
          <span className="sr-only">개</span>
        </span>
      </h2>

      <form onSubmit={handleSubmit} className="flex min-w-0 gap-2">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          enterKeyHint="done"
          value={input}
          onChange={(event) => handleChange(event.target.value)}
          placeholder="번호"
          aria-label={`${label} 번호 입력`}
          aria-describedby={messageId}
          className="min-h-12 min-w-0 flex-1 bg-background text-lg font-semibold tabular-nums"
        />
        <Button
          type="submit"
          className="min-h-12 shrink-0 px-3"
          disabled={parsed === null}
          aria-label={`${label} 추가`}
        >
          추가
        </Button>
      </form>

      {seats.length > 0 && (
        <ul className="flex min-w-0 flex-wrap gap-2">
          {seats.map((seat) => (
            <li key={seat}>
              <button
                type="button"
                onClick={() => onRemoveSeat(seat)}
                aria-label={`${label} ${seat}번 삭제`}
                className={cn(
                  SEAT_CHIP_SIZE_CLASS,
                  "border focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  SEAT_CATEGORY_COLORS[category],
                )}
              >
                {seat}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p
        id={messageId}
        aria-live="polite"
        className="min-h-5 text-sm text-destructive"
      >
        {message}
      </p>
    </section>
  );
}

// 카테고리 4개를 2x2로 배치: 스탠딩 | 카페존 / 졸음/딴짓 | 자리비움
export function SeatCategoryInput({
  seats,
  onAddSeat,
  onRemoveSeat,
  className,
}: SeatCategoryInputProps) {
  return (
    <div
      className={cn("grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2", className)}
    >
      {SEAT_CATEGORY_ORDER.map((category) => (
        <SeatSection
          key={category}
          category={category}
          seats={seats[category]}
          onAddSeat={(seat) => onAddSeat(category, seat)}
          onRemoveSeat={(seat) => onRemoveSeat(category, seat)}
        />
      ))}
    </div>
  );
}
