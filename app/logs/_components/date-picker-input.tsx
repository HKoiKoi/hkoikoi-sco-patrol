"use client";

import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";

interface DatePickerInputProps {
  /** 현재 표시 중인 영업일 (YYYY-MM-DD) */
  date: string;
}

// 날짜를 고르면 바로 ?date=YYYY-MM-DD 로 이동하는 입력. 값이 비어 있으면 이동하지 않는다.
export function DatePickerInput({ date }: DatePickerInputProps) {
  const router = useRouter();

  return (
    <Input
      type="date"
      name="date"
      value={date}
      aria-label="이동할 날짜"
      // appearance-none: iOS Safari의 네이티브 날짜 입력란은 border-box를 무시하고 패딩·테두리를 폭에 더해 옆 버튼과 겹친다
      className="h-12 w-full max-w-full min-w-0 appearance-none"
      onChange={(event) => {
        const value = event.target.value;
        if (!value) return;
        router.push(`/logs?date=${value}`);
      }}
    />
  );
}
